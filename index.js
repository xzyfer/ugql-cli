#!/usr/bin/env node
const chalk = require('chalk');
const disparity = require('disparity');
const gqlc = require('graphql-config');
const configPath = require('find-up').sync('.graphqlconfig');
const findBreakingChanges = require('graphql').findBreakingChanges;
const findDangerousChanges = require('graphql').findDangerousChanges;

const projectConfig = (config, project) => {
  return gqlc.getGraphQLProjectConfig(config, project);
};

const schemaEndpoint = (config, endpoint) => {
  const endpointsExt = config.endpointsExtension;
  const endpointNames = Object.keys(endpointsExt.getRawEndpointsMap());
  const chosenEndpointName = endpointNames[endpoint];
  return endpointsExt.getEndpoint(chosenEndpointName, process.env);
};

require('yargs')
  .options('config', {
    alias: 'c',
    default: configPath,
    description: 'Path to the graphql config file',
    type: 'string',
    demandOption: true,
  })
  .option('project', {
    alias: 'p',
    description: 'Target project from graphql config',
    type: 'string',
    demandOption: true,
  })
  .command({
    command: 'download',
    description: 'Download the schema SDL for a project',
    builder: yargs => {
      return yargs.option('endpoint', {
        alias: 'e',
        default: 'default',
        description: 'Target endpoint from graphql config file',
      });
    },
    handler: async argv => {
      const config = projectConfig(argv.config, argv.project);
      const endpoint = schemaEndpoint(config, argv.endpoint);
      const schema = await endpoint.resolveSchemaSDL();
      console.log(schema);
    },
  })
  .command({
    command: 'diff',
    description: 'Diff the local schema against the remote schema',
    builder: yargs => {
      return yargs.option('endpoint', {
        alias: 'e',
        default: 'default',
        description: 'Target endpoint from graphql config file',
      });
    },
    handler: async argv => {
      const config = projectConfig(argv.config, argv.project);
      const endpoint = schemaEndpoint(config, argv.endpoint);

      const localSchemaSDL = await config.getSchemaSDL();
      const remoteSchemaSDL = await endpoint.resolveSchemaSDL();
      const localSchema = await config.getSchema();
      const remoteSchema = await endpoint.resolveSchema();

      if (localSchemaSDL === remoteSchemaSDL) {
        console.log(chalk.green('✔ No changes'));
        return;
      }

      const diff = disparity.unified(localSchemaSDL, remoteSchemaSDL);
      const dangerousChanges = findDangerousChanges(localSchema, remoteSchema);
      const breakingChanges = findBreakingChanges(localSchema, remoteSchema);

      const hasBreakingChanges = breakingChanges.length !== 0;
      const hasDangerousChanges = dangerousChanges.length !== 0;

      console.log(diff);

      if (hasDangerousChanges) {
        console.log(chalk.yellow.bold.underline('Dangerous changes:'));

        for (const change of dangerousChanges) {
          console.log(chalk.yellow('  ⚠ ' + change.description));
        }
      }

      if (hasDangerousChanges && hasBreakingChanges) {
        console.log(); // Add additional line break
      }

      if (hasBreakingChanges) {
        console.log(chalk.red.bold.underline('BREAKING CHANGES:'));

        for (const change of breakingChanges) {
          console.log(chalk.red('  ✖ ' + change.description));
        }
      }

      if (hasDangerousChanges || hasBreakingChanges) {
        process.exit(1);
        return;
      }
    },
  })
  .demandCommand()
  .help().argv;
