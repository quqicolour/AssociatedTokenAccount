// No imports needed: web3, anchor, pg and more are globally available
import {
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  createMint,
  mintTo,
  getOrCreateAssociatedTokenAccount,
  getAssociatedTokenAddress,
  getAccount,
  transfer,
} from "@solana/spl-token";
import {
  PublicKey,
  Transaction,
  clusterApiUrl,
  Connection,
} from "@solana/web3.js";
import { createCreateMetadataAccountV3Instruction } from "@metaplex-foundation/mpl-token-metadata";

const connection = new Connection(clusterApiUrl("devnet"), "confirmed");
let token_programId = TOKEN_PROGRAM_ID;
let associated_token_programId = ASSOCIATED_TOKEN_PROGRAM_ID;

let user = pg.wallet.publicKey;
let signer = pg.wallet.keypair;
let newTokenMes = new web3.Keypair();
let saveAccount = new web3.Keypair();
console.log("User pubkey:", user.toBase58());
console.log("newTokenMes:", newTokenMes.publicKey.toBase58());
console.log("saveAccount:", saveAccount.publicKey.toBase58());

const metadataData = {
  name: "SunRise Rainbow Token",
  symbol: "SRT",
  uri: "https://arweave.net/1234",
  sellerFeeBasisPoints: 0,
  creators: null,
  collection: null,
  uses: null,
};

describe("Test", () => {
  it("initialize", async () => {
    async function create_mint(mintAddress: PublicKey) {
      const tokenMint = await createMint(
        connection,
        signer,
        mintAddress,
        null,
        6,
        newTokenMes,
        null,
        token_programId
      );
      console.log("tokenMint:", tokenMint.toString());
    }

    async function make_metadata() {
      const TOKEN_METADATA_PROGRAM_ID = new PublicKey(
        "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s"
      );

      const metadataPDAAndBump = PublicKey.findProgramAddressSync(
        [
          Buffer.from("metadata"),
          TOKEN_METADATA_PROGRAM_ID.toBuffer(),
          newTokenMes.publicKey.toBuffer(),
        ],
        TOKEN_METADATA_PROGRAM_ID
      );

      const metadataPDA = metadataPDAAndBump[0];
      const transaction = new Transaction();

      const createMetadataAccountInstruction =
        createCreateMetadataAccountV3Instruction(
          {
            metadata: metadataPDA,
            mint: newTokenMes.publicKey,
            mintAuthority: user,
            payer: user,
            updateAuthority: user,
          },
          {
            createMetadataAccountArgsV3: {
              collectionDetails: null,
              data: metadataData,
              isMutable: true,
            },
          }
        );

      transaction.add(createMetadataAccountInstruction);

      // send
      try {
        const metadataTxHash =
          await pg.program.provider.connection.sendTransaction(transaction, [
            signer,
          ]);
        console.log(`Transaction sent`);
        // confirm
        const metadataConfirmation =
          await pg.program.provider.connection.confirmTransaction(
            metadataTxHash
          );
        console.log(
          `Transaction confirmed: ${metadataTxHash}`,
          metadataConfirmation
        );
      } catch (error) {
        console.error("Error sending transaction:", error);
      }
    }

    // await create_mint(user);

    // await make_metadata();

    async function findProgramAddress(userPubkey: PublicKey, tokenPubkey: PublicKey) {
      try {
        const findAssociatedTokenAccountTx = await pg.program.methods
          .findAssociatedTokenAccount(userPubkey, tokenPubkey)
          .accounts({
            saveAccount: saveAccount.publicKey,
            user: user,
            systemProgram: web3.SystemProgram.programId,
            tokenProgram: token_programId,
          })
          .signers([signer, saveAccount])
          .rpc();
        await pg.program.provider.connection.confirmTransaction(
          findAssociatedTokenAccountTx
        );
        const associated_token = await pg.program.account.saveAccount.fetch(
          saveAccount.publicKey
        );
        console.log(
          "associated_token:",
          associated_token.associatedToken.toBase58()
        );
      } catch (e) {
        console.log("FindProgramAddress error", e);
      }
    }
    // await findProgramAddress(user, newTokenMes.publicKey);


  // let alreadyCreateTokenAccount=new PublicKey('GU2nAt9pVjRLBmLtUBzr2JYQLye94EFmCU8PhdFGcTsp');
  // let alreadyCreatedMappingAccount = new PublicKey('2JBYwuDTLkEnHX9HuVJpkFZQYXzbWkasyWnfd86YQsMu');

  // 根据 SPL Token 标准计算 ATA 地址
  const thisAssociatedTokenAccount = await getAssociatedTokenAddress(newTokenMes.publicKey, user, true, token_programId, associated_token_programId);
  console.log("正确的associatedTokenAccount:", thisAssociatedTokenAccount.toBase58());

  let mappingAccount=new web3.Keypair();
  console.log("mappingAccount keypair:",mappingAccount.secretKey.buffer);
  console.log("mappingAccount pubkey:", mappingAccount.publicKey.toBase58());

  async function CreateThisAssociatedTokenAccount(){
    // 调用 create_this_associated_token_account 指令
    try {
      const tx = await pg.program.methods.createAta()
        .accounts({
          mapping: mappingAccount.publicKey,
          user: user,
          authority: user,
          mint: newTokenMes.publicKey,
          associatedTokenAccount: thisAssociatedTokenAccount,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: web3.SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
        }).signers([signer, mappingAccount])
          .rpc();
      console.log("Transaction signature:", tx);
    } catch (error) {
      console.error("Error creating ATA:", error);
    }
  }
  await CreateThisAssociatedTokenAccount();
 

  });
});
