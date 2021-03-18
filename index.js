#!/usr/bin/env node

const nfzf = require("node-fzf");
const childProcess = require("child-process-promise");
const clipboardy = require("clipboardy");
const ora = require("ora");

async function main() {
  const kvSpinner = ora("Fetching keyvaults...").start();
  const kvListResult = await childProcess.exec("az keyvault list");
  if (kvListResult.childProcess.exitCode != 0) {
    kvSpinner.fail(`Error fetching keyvaults list: ${kvListResult.stderr}`);
    process.exit(1);
  }
  kvSpinner.stop();
  const kvNames = JSON.parse(kvListResult.stdout).map((kv) => kv.name);

  const selectKvResult = await nfzf({
    list: kvNames,
  });

  if (selectKvResult.selected == undefined) {
    console.error(`Couldn't get users choice`);
    process.exit(1);
  }

  const secretListSpinner = ora("Fetching secrets...").start();
  const secretListResult = await childProcess.exec(
    `az keyvault secret list --vault-name=${selectKvResult.selected.value}`
  );
  if (secretListResult.childProcess.exitCode != 0) {
    secretListSpinner.fail(
      `Error fetching secrets list: ${secretListResult.stderr}`
    );
    process.exit(1);
  }
  secretListSpinner.stop();
  const secretNames = JSON.parse(secretListResult.stdout).map((sc) => sc.name);

  const selectSecretResult = await nfzf({
    list: secretNames,
  });

  if (selectSecretResult.selected == undefined) {
    console.error(`Couldn't get users choice`);
    process.exit(1);
  }

  const secretSpinner = ora("Fetching secret value...").start();
  const showSecretResult = await childProcess.exec(
    `az keyvault secret show --name ${selectSecretResult.selected.value} --vault ${selectKvResult.selected.value}`
  );

  if (showSecretResult.childProcess.exitCode != 0) {
    secretSpinner.fail(
      `Error fetching secret value: ${showSecretResult.stderr}`
    );
    process.exit(1);
  }
  await clipboardy.write(JSON.parse(showSecretResult.stdout).value);
  secretSpinner.stopAndPersist({
    symbol: "✅",
    text: "Secret copied to clipboard!",
  });
}

main().catch(console.error);
