var gulp = require('gulp');
var winInstaller = require('electron-windows-installer');

gulp.task('create-windows-installer', function(done) {
  winInstaller({
    appDirectory: './dist/win/SplashDesktop-win32-x64',
    outputDirectory: './dist/win/installer',
    arch: 'ia32'
  }).then(done).catch(done);
});
