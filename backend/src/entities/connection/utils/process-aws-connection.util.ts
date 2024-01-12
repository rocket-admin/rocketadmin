import { isConnectionTypeAgent } from '../../../helpers/is-connection-entity-agent.js';
import { CreateConnectionDs } from '../application/data-structures/create-connection.ds.js';
import { readSslCertificate } from '../ssl-certificate/read-certificate.js';

export async function processAWSConnection(createConnectionData: CreateConnectionDs): Promise<CreateConnectionDs> {
  if (isConnectionTypeAgent(createConnectionData.connection_parameters.type)) {
    return createConnectionData;
  }
  const { host } = createConnectionData.connection_parameters;

  if (host.endsWith('.rds.amazonaws.com')) {
    createConnectionData.connection_parameters.ssl = true;
    createConnectionData.connection_parameters.cert = await readSslCertificate();
    return createConnectionData;
  }

  if (host.includes('amazonaws.com') && host.includes('ec2-') && host.endsWith('.compute.amazonaws.com')) {
    createConnectionData.connection_parameters.ssl = true;
    createConnectionData.connection_parameters.cert = await readSslCertificate();
    return createConnectionData;
  }

  const rdsHostRegex = /^[^.]+[.][^.]+[.](rds[.].+[.]amazonaws[.]com)$/i;
  if (rdsHostRegex.test(host)) {
    createConnectionData.connection_parameters.ssl = true;
    createConnectionData.connection_parameters.cert = await readSslCertificate();
    return createConnectionData;
  }

  const ec2HostRegex = /^(ec2-).*([.]compute[.]amazonaws[.]com)$/i;
  if (ec2HostRegex.test(host)) {
    createConnectionData.connection_parameters.ssl = true;
    createConnectionData.connection_parameters.cert = await readSslCertificate();
    return createConnectionData;
  }

  return createConnectionData;
}
