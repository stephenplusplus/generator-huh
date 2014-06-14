'use strict';
var $ = require('modmod')('chalk', 'opn', 'propprop', 'yeoman-generator', 'yosay');

var getBack = function () {};
var goBack = function () {};
var separator = { name: new $['yeoman-generator'].inquirer.Separator() };

var actions = {
  yeomanGenerator: {
    name: 'Run the Yeoman generator'
  }
};

var subjects = require('./subjects.json').map(function (subject) {
  subject.chapters = subject.chapters.map(function (chapter) {
    chapter.action = getAction(chapter);
    return chapter;
  });

  // Add actions.
  if (subject.actions) {
    subject.chapters.push(separator);
    subject.actions.forEach(function (action) {
      var chapter =  actions[action];
      chapter.action = getAction({
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
    chapter.action = getAction(chapter);
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

function getAction(where) {
  return function (done) {
    if (where === 'exit') {
      return done();
    }

    if (where === 'getBack') {
      getBack();
      return done();
    }

    if (where === 'goBack') {
      goBack();
      return done();
    }

    if (where.content) {
      console.log();
      console.log($.chalk.bgCyan.bold.white('', where.name, ''));
      console.log(where.content);
      console.log();
      getBack();
      return done();
    }

    if (where.action) {
      if (where.action === 'yeomanGenerator') {
        runGenerator(where.subject.yeomanGenerator, done);
      }
      return;
    }

    if (where.href) {
      $.opn(where.href);
      return done();
    }
  };
}

function runGenerator(generatorName, done) {
  // Check if the generator is installed.
  // Install it if not.
  // Run the generator.
  console.log(generatorName);
  done();
}

module.exports = $['yeoman-generator'].generators.Base.extend({
  init: function () {
    this._askSubject(this.async());
  },

  _askSubject: function (done) {
    goBack = getBack;
    getBack = function () {
      this._askSubject(done);
    }.bind(this);

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
    goBack = getBack;
    getBack = function () {
      this._askChapter(done);
    }.bind(this);

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
