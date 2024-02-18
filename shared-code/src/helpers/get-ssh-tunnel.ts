import { createTunnel } from 'tunnel-ssh';
import { ConnectionParams } from '../data-access-layer/shared/data-structures/connections-params.ds.js';

export async function getTunnel(connection: ConnectionParams, freePort: number) {
  const { host, port, privateSSHKey, sshPort, sshHost, sshUsername } = connection;
  const sshOptions = {
    host: sshHost,
    port: sshPort,
    username: sshUsername,
    privateKey: privateSSHKey,
  };

  let forwardOptions = {
    srcAddr: 'localhost',
    srcPort: freePort,
    dstAddr: host,
    dstPort: port,
  };

  let tunnelOptions = {
    autoClose: true,
  };

  const serverOptions = {
    port: freePort,
  };

  return await createTunnel(tunnelOptions, serverOptions, sshOptions, forwardOptions);
}
