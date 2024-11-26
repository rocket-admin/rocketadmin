/* eslint-disable @typescript-eslint/no-require-imports */
const waitOn = require('wait-on');
const { exec } = require('child_process');
const { Pool } = require('ibm_db');

const opts = {
  resources: ['tcp:test-ibm-db2-e2e-testing:50000'],
  delay: 1000,
  interval: 1000,
  timeout: 60000,
  tcpTimeout: 1000,
  window: 1000,
};

async function testConnectionToDB2() {
  let connStr = `DATABASE=testdb;HOSTNAME=test-ibm-db2-e2e-testing;UID=db2inst1;PWD=password;PORT=50000;PROTOCOL=TCPIP`;
  const connectionPool = new Pool();
  try {
    const databaseConnection = await connectionPool.open(connStr);
    const query = `SELECT 1 FROM sysibm.sysdummy1`;
    const testResult = await databaseConnection.query(query);
    await databaseConnection.close();
    if (testResult && testResult[0] && testResult[0]['1'] === 1) {
      return true;
    }
  } catch (error) {
    console.error('Error connecting to DB2:', error);
    return false;
  }
}

function checkDB2() {
  waitOn(opts, async function (err) {
    if (err) {
      console.error('Error waiting for DB2:', err);
      setTimeout(checkDB2, 5000);
    } else {
      console.log('DB2 is available');
      const isConnected = await testConnectionToDB2();
      if (isConnected) {
        console.log('Successfully connected to DB2');
        console.log('Waiting for 35 seconds to make sure everything is ready...');
        setTimeout(() => {
          console.log('Probably DB2 is ready. Starting the application...');
          const child = exec('yarn start:dev', (err, stdout, stderr) => {
            if (err) {
              console.error('Error starting the application:', err);
              process.exit(1);
            }
            console.log('Application stdout:', stdout);
            console.error('Application stderr:', stderr);
            console.log('Application started');
          });

          child.stdout.on('data', (data) => {
            console.log(`stdout: ${data}`);
          });

          child.stderr.on('data', (data) => {
            console.error(`stderr: ${data}`);
          });

          child.on('close', (code) => {
            console.log(`child process exited with code ${code}`);
          });
        }, 35000);
      } else {
        console.error('Failed to connect to DB2');
        setTimeout(checkDB2, 5000);
      }
    }
  });
}

checkDB2();
