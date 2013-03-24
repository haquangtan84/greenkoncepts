basePath = '../';

files = [
  JASMINE,
  JASMINE_ADAPTER,
  'public/js/lib/angular/angular.min.js',
  'public/test/lib/angular/angular-mocks.js',
  'public/js/lib/jquery-1.9.1.min.js',
  'public/js/**/*.js',
  'public/test/unit/**/*.js'
];

autoWatch = true;

browsers = ['Chrome'];

junitReporter = {
  outputFile: 'test_out/unit.xml',
  suite: 'unit'
};
