// Regression-test tripwire, not a security sandbox for hostile code.
import http from 'node:http';
import https from 'node:https';
import net from 'node:net';
import tls from 'node:tls';
import dgram from 'node:dgram';
import dns from 'node:dns';
import {syncBuiltinESMExports} from 'node:module';
const blocked=()=>{throw Error('External network is forbidden in offline regression tests.');};
globalThis.fetch=blocked;
for(const mod of [http,https]){mod.request=blocked;mod.get=blocked;}
net.connect=blocked;net.createConnection=blocked;net.Socket.prototype.connect=blocked;
tls.connect=blocked;dgram.createSocket=blocked;dns.lookup=blocked;
syncBuiltinESMExports();
