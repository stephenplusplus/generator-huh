'use strict';
var $ = require('modmod')('chalk', 'fs', 'opn', 'propprop', 'sillystring', 'yeoman-generator', 'yosay');

var getBack = function () {};
var goBack = function () {};
var separator = { name: new $['yeoman-generator'].inquirer.Separator() };
var installedGenerators;
var spawnCommand;
var log;

var hooks = {
  yeomanGenerator: {
    name: 'Run the Yeoman generator'
  }
};

var subjects = require('./subjects.json').map(function (subject) {
  subject.chapters = subject.chapters.map(function (chapter) {
    chapter.action = getAction('content', chapter);
    return chapter;
  });

  // Add hooks.
  if (subject.hooks) {
    subject.chapters.push(separator);
    subject.hooks.forEach(function (hook) {
      subject.chapters.push(extend(
        hooks[hook],
        {
          action: getAction('hook', {
            hook: hook,
            subject: subject
          })
        }
      ));
    });
  }

  // Add links.
  subject.chapters.push(separator);
  subject.links.forEach(function (link) {
    subject.chapters.push(extend(link, { action: getAction('link', link) }));
  });

  // Add navigation actions.
  subject.chapters = subject.chapters.concat([
    separator,
    { name: 'Go back', action: getAction('goBack') },
    { name: 'Exit', action: getAction('exit') }
  ]);

  return subject;
});

function getAction(type, obj) {
  return function (done) {
    if (type === 'exit') return done();
    if (type === 'getBack') return getBack() && done();
    if (type === 'goBack')  return goBack() && done();

    if (type === 'content') {
      log();
      log(heading(obj.name));
      log(obj.content);
      log();
      getBack();
      return done();
    }

    if (type === 'hook') {
      if (obj.hook === 'yeomanGenerator') {
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

function mkdir(dirName, callback) {
  if ($.fs.existsSync(dirName)) {
    return mkdir(dirName + '-' + $.sillystring().replace(/[\W]+/g, '-'), callback);
  } else {
    return $.fs.mkdir(dirName, function (err) {
      process.chdir(dirName);
      callback(err, dirName);
    });
  }
}

function runGenerator(generatorName, done) {
  var generator = installedGenerators[generatorName];

  if (!generator) {
    generator = Object.keys(installedGenerators).filter(function (generator) {
      return generator === generatorName.replace('generator-', '') + ':app';
    })[0];
  }

  if (generator) {
    mkdir(generator.split(':')[0] + '-app', function (err, createdDirectory) {
      if (err) {
        goBack();
        return done();
      }

      spawnCommand('yo', [generator])
        .on('exit', function (err) {
          if (err) {
            goBack();
            return done();
          }

          log();
          log(heading('App created!'));
          log('A new app has been scaffolded for you in ./' + createdDirectory + '.');
          done();
        })
        .on('error', function () {
          goBack();
          done();
        });
      });
  } else {
    spawnCommand('npm', ['install', '-g', generatorName])
      .on('exit', function (err) {
        if (err) {
          goBack();
          return done();
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

function heading(text) {
  return $.chalk.bgCyan.bold.white('', text, '');
}

function pick(array, prop, value) {
  return array.filter(function (item) {
    return item[prop] === value;
  })[0];
}

function extend(obj1, obj2) {
  for (var prop in obj1) obj2[prop] = obj1[prop];
  return obj2;
}

module.exports = $['yeoman-generator'].generators.Base.extend({
  init: function () {
    installedGenerators = this.env.getGeneratorsMeta();
    spawnCommand = this.spawnCommand;
    log = this.log.bind(this);
    this._askSubject(this.async());
  },

  _askSubject: function (done) {
    this._setNavigationSteps('_askSubject', done);

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
    this._setNavigationSteps('_askChapter', done);

    log($.yosay('Ah yes, ' + this.subject.name + '. You know, ' + this.subject.description, { maxLength: 60 }));

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
  },

  _setNavigationSteps: function (activeStep, done) {
    var steps = ['_askSubject', '_askChapter'];

    getBack = function () {
      this[activeStep](done);
    }.bind(this);

    goBack = function () {
      this[steps[steps.indexOf(activeStep) - 1]](done);
    }.bind(this);
  }
});
