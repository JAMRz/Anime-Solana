use anchor_lang::prelude::*;

declare_id!("FNeVwwfPQjBhKze8D6iM3UYMJrY9wwmMXPCtSSxBQMtW");

#[program]
pub mod lista_anime {
    use super::*;

    pub fn crear_lista(ctx: Context<CrearLista>, nombre: String) -> Result<()> {
        require!(nombre.len() <= 50, ErrorListaAnime::NombreMuyLargo);

        let lista = &mut ctx.accounts.lista;
        lista.owner = ctx.accounts.owner.key();
        lista.nombre = nombre;
        lista.animes = Vec::new();
        lista.bump = ctx.bumps.lista;

        Ok(())
    }

    pub fn agregar_anime(
        ctx: Context<ModificarLista>,
        nombre: String,
        episodios: u16,
    ) -> Result<()> {
        require!(nombre.len() <= 50, ErrorListaAnime::NombreMuyLargo);

        let lista = &mut ctx.accounts.lista;

        require!(
            lista.animes.len() < 10,
            ErrorListaAnime::LimiteAnimesAlcanzado
        );

        lista.animes.push(Anime {
            nombre,
            episodios,
            visto: false,
        });

        Ok(())
    }

    pub fn alternar_visto(ctx: Context<ModificarLista>, index: u64) -> Result<()> {
        let lista = &mut ctx.accounts.lista;
        let i = index as usize;

        require!(i < lista.animes.len(), ErrorListaAnime::IndiceInvalido);

        lista.animes[i].visto = !lista.animes[i].visto;

        Ok(())
    }

    pub fn eliminar_anime(ctx: Context<ModificarLista>, index: u64) -> Result<()> {
        let lista = &mut ctx.accounts.lista;
        let i = index as usize;

        require!(i < lista.animes.len(), ErrorListaAnime::IndiceInvalido);

        lista.animes.remove(i);

        Ok(())
    }

    pub fn cerrar_lista(_ctx: Context<CerrarLista>) -> Result<()> {
        Ok(())
    }
}

#[derive(Accounts)]
pub struct CrearLista<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(
        init,
        payer = owner,
        space = ListaAnime::INIT_SPACE,
        seeds = [b"lista", owner.key().as_ref()],
        bump
    )]
    pub lista: Account<'info, ListaAnime>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ModificarLista<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(
        mut,
        seeds = [b"lista", owner.key().as_ref()],
        bump = lista.bump,
        has_one = owner
    )]
    pub lista: Account<'info, ListaAnime>,
}

#[derive(Accounts)]
pub struct CerrarLista<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(
        mut,
        seeds = [b"lista", owner.key().as_ref()],
        bump = lista.bump,
        has_one = owner,
        close = owner
    )]
    pub lista: Account<'info, ListaAnime>,
}

#[account]
#[derive(InitSpace)]
pub struct ListaAnime {
    pub owner: Pubkey,
    #[max_len(50)]
    pub nombre: String,
    #[max_len(10, 50)]
    pub animes: Vec<Anime>,
    pub bump: u8,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, InitSpace)]
pub struct Anime {
    #[max_len(50)]
    pub nombre: String,
    pub episodios: u16,
    pub visto: bool,
}

#[error_code]
pub enum ErrorListaAnime {
    #[msg("El nombre es demasiado largo.")]
    NombreMuyLargo,

    #[msg("Índice inválido.")]
    IndiceInvalido,

    #[msg("Se alcanzó el límite de animes.")]
    LimiteAnimesAlcanzado,
}
