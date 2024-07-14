import { ContentScriptTypes, RPCClient } from './rpc';
import { RequestHistory } from '../Background/rpc';
import { Proof } from 'tlsn-js/build/types';
import { PluginConfig, PluginMetadata } from '../../utils/misc';
import { getDataFromBlockHash } from '../../utils/availUtils';
import { decryptData, hexStringToH256 } from '../../utils/cryptoUtils';
import axios from 'axios';

const client = new RPCClient();

class TLSN {
  async getHistory(
    method: string,
    url: string,
    metadata?: {
      [key: string]: string;
    },
  ): Promise<
    (Pick<
      RequestHistory,
      'id' | 'method' | 'notaryUrl' | 'url' | 'websocketProxyUrl'
    > & { time: Date })[]
  > {
    const resp = await client.call(ContentScriptTypes.get_history, {
      method,
      url,
      metadata,
    });

    return resp || [];
  }

  async getZap(url: string): Promise< { decrypted: string } | null > {
    try{
    const resp = await client.call(ContentScriptTypes.get_zap, { url });

    const encryptionKey = 'myconstantkey123456';

    const publicKey = "Luiz"

    const urlSaveDb = "http://localhost:4000/txhash/" + publicKey + "/user/" + url + "/url"

    const response = await axios.get(urlSaveDb);

    const txHashes = response.data.txHashes;

    if(txHashes.length < 0) {
      return null;
    }

    const transaction = txHashes[0];




  //   const txHash =
  //   '0x12802b0d7d10d145382762de2f8584b227f8d10dd886816d5a6e483d5428d8e2';
  // const blockHash =
  //   '0xcb4a4350e66b8a99cff5039a9b4225225d810be968bd9d540b49d1372c263f50';

  const txHash = transaction.tx_hash;
  const blockHash = transaction.block_hash;
    const data = await getDataFromBlockHash(
      blockHash,
      hexStringToH256(txHash),
    );

    const cleanedData = data?.toString().replace(/ /, '');

    const decrypted = decryptData(cleanedData, encryptionKey);

    return {
      decrypted
    }
  }catch{
    return null
  }}

  async getProof(id: string): Promise<Proof | null> {
    const resp = await client.call(ContentScriptTypes.get_proof, {
      id,
    });

    return resp || null;
  }

  async notarize(
    url: string,
    requestOptions?: {
      method?: string;
      headers?: { [key: string]: string };
      body?: string;
    },
    proofOptions?: {
      notaryUrl?: string;
      websocketProxyUrl?: string;
      maxSentData?: number;
      maxRecvData?: number;
      maxTranscriptSize?: number;
      metadata?: {
        [k: string]: string;
      };
    },
  ): Promise<Proof> {
    const resp = await client.call(ContentScriptTypes.notarize, {
      url,
      method: requestOptions?.method,
      headers: requestOptions?.headers,
      body: requestOptions?.body,
      maxSentData: proofOptions?.maxSentData,
      maxRecvData: proofOptions?.maxRecvData,
      maxTranscriptSize: proofOptions?.maxTranscriptSize,
      notaryUrl: proofOptions?.notaryUrl,
      websocketProxyUrl: proofOptions?.websocketProxyUrl,
      metadata: proofOptions?.metadata,
    });

    return resp;
  }

  async installPlugin(
    url: string,
    metadata?: { [k: string]: string },
  ): Promise<string> {
    const resp = await client.call(ContentScriptTypes.install_plugin, {
      url,
      metadata,
    });

    return resp;
  }

  async getPlugins(
    url: string,
    origin?: string,
    metadata?: {
      [key: string]: string;
    },
  ): Promise<(PluginConfig & { hash: string; metadata: PluginMetadata })[]> {
    const resp = await client.call(ContentScriptTypes.get_plugins, {
      url,
      origin,
      metadata,
    });

    return resp;
  }

  async runPlugin(hash: string) {
    const resp = await client.call(ContentScriptTypes.run_plugin, {
      hash,
    });

    return resp;
  }
}

const connect = async () => {
  const resp = await client.call(ContentScriptTypes.connect);

  if (resp) {
    return new TLSN();
  }
};

// @ts-ignore
window.tlsn = {
  connect,
};
