'use strict';
var $ = require('modmod')('chalk', 'opn', 'propprop', 'yeoman-generator', 'yosay');

var getBack = function () {};
var goBack = function () {};
var separator = { name: new $['yeoman-generator'].inquirer.Separator() };
var installedGenerators;
var refreshGenerators;
var spawnCommand;

var actions = {
  yeomanGenerator: {
    name: 'Run the Yeoman generator'
  }
};

var subjects = require('./subjects.json').map(function (subject) {
  subject.chapters = subject.chapters.map(function (chapter) {
    chapter.action = getAction('content', chapter);
    return chapter;
  });

  // Add actions.
  if (subject.actions) {
    subject.chapters.push(separator);
    subject.actions.forEach(function (action) {
      var chapter = actions[action];
      chapter.action = getAction('action', {
        action: action,
        subject: subject
      });
      subject.chapters.push(chapter);
    });
  }

  // Add links.
  subject.chapters.push(separator);
  subject.links.forEach(function (link) {
    var chapter = link;
    chapter.action = getAction('link', chapter);
    subject.chapters.push(chapter);
  });

  // Add navigation actions.
  subject.chapters = subject.chapters.concat([
    separator,
    {
      name: 'Go back',
      action: getAction('goBack')
    },
    {
      name: 'Exit',
      action: getAction('exit')
    }
  ]);

  return subject;
});

function pick(array, prop, value) {
  return array.filter(function (item) {
    return item[prop] === value;
  })[0];
}

function getAction(type, obj) {
  return function (done) {
    if (type === 'exit') return done();
    if (type === 'getBack') return getBack() && done();
    if (type === 'goBack')  return goBack() && done();

    if (type === 'content') {
      console.log();
      console.log($.chalk.bgCyan.bold.white('', obj.name, ''));
      console.log(obj.content);
      console.log();
      getBack();
      return done();
    }

    if (type === 'action') {
      if (obj.action === 'yeomanGenerator') {
        runGenerator(obj.subject.yeomanGenerator, done);
      }
      return;
    }

    if (type === 'link') {
      $.opn(obj.href);
      return done();
    }
  };
}

function runGenerator(generatorName, done) {
  var generator = installedGenerators[generatorName];

  if (!generator) {
    generator = Object.keys(installedGenerators).filter(function (generator) {
      return generator === generatorName.replace('generator-', '') + ':app';
    })[0];
  }

  if (generator) {
    spawnCommand('yo', [generator])
      .on('error', function () {
        goBack();
        done();
      });
  } else {
    // Install the generator.
    spawnCommand('npm', ['install', '-g', generatorName])
      .on('exit', function (err) {
        if (err) {
          goBack();
          done();
          return;
        }

        generatorName = generatorName.replace('generator-', '') + ':app';
        installedGenerators[generatorName] = generatorName;
        runGenerator(generatorName, done);
      })
      .on('error', function () {
        goBack();
        done();
      });
  }
}

var steps = ['_askSubject', '_askChapter'];
function setNavigationSteps(activeStep, done) {
  getBack = function () {
    this[activeStep](done);
  }.bind(this);

  goBack = function () {
    this[steps[steps.indexOf(activeStep) - 1]](done);
  }.bind(this);
}

module.exports = $['yeoman-generator'].generators.Base.extend({
  init: function () {
    refreshGenerators = function () {
      installedGenerators = this.env.getGeneratorsMeta();
    }.bind(this);
    spawnCommand = this.spawnCommand;

    refreshGenerators();
    this._askSubject(this.async());
  },

  _askSubject: function (done) {
    setNavigationSteps.call(this, '_askSubject', done);

    this.prompt([
      {
        type: 'list',
        name: 'subject',
        message: 'What do you want to learn today?',
        choices: subjects.map($.propprop('name'))
      }
    ], function (props) {
      this.subject = pick(subjects, 'name', props.subject);

      this._askChapter(done);
    }.bind(this));
  },

  _askChapter: function (done) {
    setNavigationSteps.call(this, '_askChapter', done);

    this.log($.yosay('Ah yes, ' + this.subject.name + '. You know, ' + this.subject.description, { maxLength: 60 }));

    this.prompt([
      {
        type: 'list',
        name: 'chapter',
        message: 'Which way should we go?',
        choices: this.subject.chapters.map($.propprop('name'))
      }
    ], function (props) {
      pick(this.subject.chapters, 'name', props.chapter).action(done);
    }.bind(this));
  }
});
