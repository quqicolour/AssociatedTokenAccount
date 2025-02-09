use anchor_lang::prelude::*;
use anchor_spl::associated_token::*;
use anchor_spl::token::{Mint, Token, TokenAccount};
use spl_associated_token_account::get_associated_token_address;
use spl_associated_token_account::instruction::create_associated_token_account;

declare_id!("4rqCJs8YoanKaYnD8dPeRzCtYf9EjxEdfKQ9qXGK2pY8");

#[derive(AnchorSerialize, AnchorDeserialize, Clone, InitSpace)]
pub struct SaveAssociatedTokenAccount {
    pub user: Pubkey,
    pub spl_token: Pubkey,
    pub associated_token_account: Pubkey,
}

#[account]
#[derive(InitSpace)]
pub struct MappingUserToAssociatedTokenAccount {
    #[max_len(10)]
    pub mappings: Vec<SaveAssociatedTokenAccount>,
}

impl MappingUserToAssociatedTokenAccount {
    pub fn set(&mut self, user: Pubkey, spl_token: Pubkey, associated_token_account: Pubkey) {
        if let Some(pair) = self
            .mappings
            .iter_mut()
            .find(|pair| pair.user == user && pair.spl_token == spl_token)
        {
            pair.associated_token_account = associated_token_account;
        } else {
            self.mappings.push(SaveAssociatedTokenAccount {
                user,
                spl_token,
                associated_token_account,
            });
        }
    }

    pub fn get(&self, user: Pubkey, spl_token: Pubkey) -> Option<Pubkey> {
        self.mappings
            .iter()
            .find(|pair| pair.user == user && pair.spl_token == spl_token)
            .map(|pair| pair.associated_token_account)
    }
}

#[program]
pub mod create_ata {
    use super::*;

    pub fn find_associated_token_account(
        ctx: Context<FindAssociatedTokenAccount>,
        user_key: Pubkey,
        token_mint_address: Pubkey,
    ) -> Result<()> {
        let associated_token_address: Pubkey =
            get_associated_token_address(&user_key, &token_mint_address);
        ctx.accounts.save_account.associated_token = associated_token_address;
        Ok(())
    }

    pub fn create_ata(ctx: Context<CreateATA>) -> Result<()> {
        let mapping = &mut ctx.accounts.mapping;
        let user = &ctx.accounts.user.to_account_info();
        let token_mint_address = &ctx.accounts.mint.to_account_info();
        let associated_token_address: Pubkey =
            get_associated_token_address(&user.key(), &token_mint_address.key());
        mapping.set(user.key(), token_mint_address.key(), associated_token_address);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct FindAssociatedTokenAccount<'info> {
    #[account(
        init, 
        payer = user,
        space = 8 + SaveAccount::INIT_SPACE
    )]
    pub save_account: Account<'info, SaveAccount>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>, // 系统程序
    pub token_program: Program<'info, Token>,   // 代币程序
}

#[derive(Accounts)]
pub struct CreateATA<'info> {
    #[account(
        init, 
        payer = user,
        space = 8 + MappingUserToAssociatedTokenAccount::INIT_SPACE
    )]
    pub mapping: Account<'info, MappingUserToAssociatedTokenAccount>,
    #[account(mut)]
    pub user: Signer<'info>, // 支付租金和费用的账户
    // 关联账户的拥有者（不需要是签名者）
    /// CHECK: 这是ATA的拥有者地址，不需要签名
    pub authority: UncheckedAccount<'info>,
    // 代币的Mint账户（自动验证）
    pub mint: Account<'info, Mint>,
    // 自动关联的ATA账户（自动验证）
    #[account(
        init_if_needed,
        payer = user,
        associated_token::mint = mint,
        associated_token::authority = authority
    )]
    pub associated_token_account: Account<'info, TokenAccount>,
    // 关联代币程序
    pub associated_token_program: Program<'info, AssociatedToken>,
    // 系统程序
    pub system_program: Program<'info, System>,
    // 代币程序
    pub token_program: Program<'info, Token>,
}

#[account]
#[derive(InitSpace)]
pub struct SaveAccount {
    pub associated_token: Pubkey,
}