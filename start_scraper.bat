@echo off
cd /d %~dp0
npm install
start http://localhost:3000
node app.js
pause