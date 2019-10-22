const gqlc = require('graphql-config');
const configPath = require('find-up').sync('.graphqlconfig');

const downloadSchemaSDL = async argv => {
  const config = gqlc.getGraphQLProjectConfig(argv.config, argv.project);
  const endpointsExt = config.endpointsExtension;
  const endpointNames = Object.keys(endpointsExt.getRawEndpointsMap());
  const chosenEndpointName = endpointNames[argv.endpoint];
  const endpoint = endpointsExt.getEndpoint(chosenEndpointName, process.env);

  return await endpoint.resolveSchemaSDL();
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
      const schema = await downloadSchemaSDL(argv);
      console.log(schema);
    },
  })
  .demandCommand()
  .help().argv;
