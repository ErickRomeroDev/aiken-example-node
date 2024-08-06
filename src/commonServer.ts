import { IFetcher, MeshTxBuilder, UTxO } from "@meshsdk/core";
import { v2ScriptToBech32 } from "@meshsdk/core-csl";

export type MeshTxInitiatorServerInput = {
  mesh: MeshTxBuilder;
  fetcher?: IFetcher;
  networkId?: number;
  stakeCredential?: string;
};

export class MeshTxInitiatorServer {
  mesh: MeshTxBuilder;
  fetcher?: IFetcher;
  stakeCredential?: string;
  networkId = 0;

  constructor({ mesh, fetcher, networkId, stakeCredential }: MeshTxInitiatorServerInput) {
    this.mesh = mesh;
    if (fetcher) {
      this.fetcher = fetcher;
    }
    if (networkId) {
      this.networkId = networkId;
    }
    if (stakeCredential) {
      this.stakeCredential = this.stakeCredential;
    }
  }

  protected queryAllUtxos = async (addresses: string[]) : Promise<UTxO[]> => {
    const utxos =  await Promise.all(
      addresses.map(async (address) => {
        return await this.fetcher?.fetchAddressUTxOs(address);
      }))
    return utxos[0]!
  } ;

  protected signSubmitReset = async () => {
    const signedTx = this.mesh.completeSigning();
    const txHash = await this.mesh.submitTx(signedTx);
    this.mesh.reset();
    return txHash;
  };

  protected queryUtxos = async (walletAddress: string): Promise<UTxO[]> => {
    if (this.fetcher) {
      const utxos = await this.fetcher.fetchAddressUTxOs(walletAddress);
      return utxos;
    }
    return [];
  };

  protected queryCollateral = async (txHash: string, outputIndex: number, providedUtxos: UTxO[] ): Promise<UTxO> => {
    let utxos: UTxO[] = providedUtxos;
    const selectedUtxos =  utxos.filter((u) => {
      const txHashEqual = u.input.txHash === txHash;
      const outputIndexEqual = u.input.outputIndex === outputIndex;
      return txHashEqual && outputIndexEqual;
    });
    return selectedUtxos[0]
  };

  protected getAddressUtxosWithMinLovelace = async (walletAddress: string, lovelace: number, providedUtxos: UTxO[] = []) => {
    let utxos: UTxO[] = providedUtxos;
    if (this.fetcher && (!providedUtxos || providedUtxos.length === 0)) {
      utxos = await this.fetcher.fetchAddressUTxOs(walletAddress);
    }
    return utxos.filter((u) => {
      const lovelaceAmount = u.output.amount.find((a: any) => a.unit === "lovelace")?.quantity;
      return Number(lovelaceAmount) > lovelace;
    });
  };

  protected getAddressUtxosWithToken = async (walletAddress: string, assetHex: string, userUtxos: UTxO[] = []) => {
    let utxos: UTxO[] = userUtxos;
    if (this.fetcher && userUtxos.length === 0) {
      utxos = await this.fetcher.fetchAddressUTxOs(walletAddress);
    }
    return utxos.filter((u) => {
      const assetAmount = u.output.amount.find((a: any) => a.unit === assetHex)?.quantity;
      return Number(assetAmount) >= 1;
    });
  };

  protected _getUtxoByTxHash = async (txHash: string, scriptCbor?: string): Promise<UTxO | undefined> => {
    if (this.fetcher) {
      const utxos = await this.fetcher?.fetchUTxOs(txHash);
      let scriptUtxo = utxos[0];

      if (scriptCbor) {
        const scriptAddr = v2ScriptToBech32(scriptCbor, undefined, this.networkId);
        scriptUtxo = utxos.filter((utxo) => utxo.output.address === scriptAddr)[0] || utxos[0];
      }

      return scriptUtxo;
    }

    return undefined;
  };
}
