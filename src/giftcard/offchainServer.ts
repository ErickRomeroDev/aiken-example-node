import { MeshTxInitiatorServer, MeshTxInitiatorServerInput } from "../commonServer";
import {
  builtinByteString,
  BuiltinByteString,
  Integer,
  List,
  mConStr0,
  mConStr1,
  PlutusScript,
  stringToHex,
  txOutRef,
} from "@meshsdk/common";
import {
  Asset,
  deserializeDatum,
  resolveScriptHash,
  serializePlutusScript,
  UTxO,
} from "@meshsdk/core";
import { applyParamsToScript } from "@meshsdk/core-csl";
import blueprint from "./aiken-workspace/plutus.json";
import { walletSentToServerInfoType } from "./runServer";

export const MeshGiftCardBlueprint = blueprint;

export class MeshGiftCardContract extends MeshTxInitiatorServer {
  walletAddresses: string[] = [""];
  changeAddress: string;
  collateralTxHash: string;
  collateralOutputIndex: number;
  collateralAddress: string;
  tokenNameHex: string = "";
  paramUtxo: UTxO["input"] = { outputIndex: 0, txHash: "" };  

  giftCardCbor = (tokenNameHex: string, utxoTxHash: string, utxoTxId: number) => {
    return applyParamsToScript(
      blueprint.validators[0]!.compiledCode,
      [builtinByteString(tokenNameHex), txOutRef(utxoTxHash, utxoTxId)],
      "JSON"
    );
  };

  redeemCbor = (tokenNameHex: string, policyId: string) =>
    applyParamsToScript(blueprint.validators[1]!.compiledCode, [tokenNameHex, policyId]);

  constructor(inputs: MeshTxInitiatorServerInput, walletSentToServerInfo: walletSentToServerInfoType, tokenNameHex?: string, paramUtxo?: UTxO["input"]) {
    super(inputs);    
    this.walletAddresses = walletSentToServerInfo.usedAddresses; 
    this.changeAddress = walletSentToServerInfo.changeAddress;
    this.collateralTxHash = walletSentToServerInfo.collateralTxHash;
    this.collateralOutputIndex = walletSentToServerInfo.collateralOutputIndex; 
    this.collateralAddress = walletSentToServerInfo.collateraAddress; 
    if (tokenNameHex) {
      this.tokenNameHex = tokenNameHex;
    }
    if (paramUtxo) {
      this.paramUtxo = paramUtxo;
    }
  }

  createGiftCard = async (
    tokenName: string,
    giftValue: Asset[],
  ): Promise<string> => {
    const utxos = await this.queryAllUtxos(this.walletAddresses)   
    const collateral =  await this.queryCollateral(this.collateralTxHash, this.collateralOutputIndex, utxos!);
    console.log("utxos",utxos)
    console.log("collateral",collateral)
    const tokenNameHex = stringToHex(tokenName);
    const firstUtxo = utxos[0]!;
    if (firstUtxo === undefined) throw new Error("No UTXOs available");
    const remainingUtxos = utxos!.slice(1);
    const giftCardScript = this.giftCardCbor(
      tokenNameHex,
      firstUtxo.input.txHash,
      firstUtxo.input.outputIndex,
    );

    const giftCardPolicy = resolveScriptHash(giftCardScript, "V2");

    const redeemScript: PlutusScript = {
      code: this.redeemCbor(tokenNameHex, giftCardPolicy),
      version: "V2",
    };

    const redeemAddr = serializePlutusScript(
      redeemScript,
      undefined,
      this.networkId,
    ).address;

    console.log("redeemAddr",redeemAddr)

    await this.mesh
      .txIn(
        firstUtxo.input.txHash,
        firstUtxo.input.outputIndex,
        firstUtxo.output.amount,
        firstUtxo.output.address,
      )
      .mintPlutusScriptV2()
      .mint("1", giftCardPolicy, tokenNameHex)
      .mintingScript(giftCardScript)
      .mintRedeemerValue(mConStr0([]))
      .txOut(redeemAddr, [
        ...giftValue,
        { unit: giftCardPolicy + tokenNameHex, quantity: "1" },
      ])
      .txOutInlineDatumValue([
        firstUtxo.input.txHash,
        firstUtxo.input.outputIndex,
        tokenNameHex,
      ])
      .changeAddress(this.changeAddress)
      .txInCollateral(
        collateral.input.txHash,
        collateral.input.outputIndex,
        collateral.output.amount,
        collateral.output.address,
      )
      .selectUtxosFrom(remainingUtxos)
      .complete();

    this.tokenNameHex = tokenNameHex;
    this.paramUtxo = firstUtxo.input;

    return this.mesh.txHex;
  };

  redeemGiftCard = async (giftCardUtxo: UTxO): Promise<string> => {
    const utxos = await this.queryAllUtxos(this.walletAddresses)   
    const collateral =  await this.queryCollateral(this.collateralTxHash, this.collateralOutputIndex, utxos!);
    const remainingUtxos = utxos!.slice(1);

    console.log("collateral",collateral)

    const inlineDatum = deserializeDatum<List>(
      giftCardUtxo.output.plutusData!,
    ).list;
    const paramTxHash = (inlineDatum[0] as BuiltinByteString).bytes;
    const paramTxId = (inlineDatum[1] as Integer).int as number;
    const tokenNameHex = (inlineDatum[2] as BuiltinByteString).bytes;

    console.log("paramTxHash",paramTxHash)
    
    const giftCardScript = this.giftCardCbor(
      tokenNameHex,
      paramTxHash,
      paramTxId,
    );

    const giftCardPolicy = resolveScriptHash(giftCardScript, "V2");

    const redeemScript = this.redeemCbor(tokenNameHex, giftCardPolicy);   
    
    console.log("redeemScript",redeemScript)

    await this.mesh
      .spendingPlutusScriptV2()
      .txIn(
        giftCardUtxo.input.txHash,
        giftCardUtxo.input.outputIndex,
        giftCardUtxo.output.amount,
        giftCardUtxo.output.address,
      )
      .spendingReferenceTxInInlineDatumPresent()
      .spendingReferenceTxInRedeemerValue("")
      .txInScript(redeemScript)
      .mintPlutusScriptV2()
      .mint("-1", giftCardPolicy, tokenNameHex)
      .mintingScript(giftCardScript)
      .mintRedeemerValue(mConStr1([]))
      .changeAddress(this.changeAddress)
      .txInCollateral(
        collateral.input.txHash,
        collateral.input.outputIndex,
        collateral.output.amount,
        collateral.output.address,
      )
      .selectUtxosFrom(remainingUtxos)
      .complete();
    return this.mesh.txHex;
  };

  getUtxoByTxHash = async (txHash: string): Promise<UTxO | undefined> => {
    return await this._getUtxoByTxHash(txHash);
  };
}
