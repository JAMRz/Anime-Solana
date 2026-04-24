import { PublicKey, SystemProgram } from "@solana/web3.js";

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface Anime {
  nombre: string;
  episodios: number;
  visto: boolean;
}

interface ListaAnime {
  owner: PublicKey;
  nombre: string;
  animes: Anime[];
  bump: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function log(msg: string) {
  console.log(msg);
}

function logAnimes(animes: Anime[]) {
  animes.forEach((a, i) =>
    log(`      [${i}] ${a.nombre} | ${a.episodios} eps | visto: ${a.visto}`)
  );
}

function extractAnchorError(e: unknown): string {
  if (!(e instanceof Error)) return String(e);

  // Anchor codifica el código de error en logs y mensaje; buscamos el nombre
  // del error que definimos en el enum ErrorListaAnime
  const errorNames = [
    "NombreMuyLargo",
    "IndiceInvalido",
    "LimiteAnimesAlcanzado",
  ];
  for (const name of errorNames) {
    if (e.message.includes(name)) return name;
  }

  // Fallback: primer renglón del mensaje
  return e.message.split("\n")[0];
}

function assertError(e: unknown, expected: string, testLabel: string) {
  const found = extractAnchorError(e);
  if (found === expected) {
    log(`   ✅ Error esperado: ${expected}`);
  } else {
    log(`   ⚠️  Error inesperado en ${testLabel}: ${found}`);
  }
}

async function fetchLista(listaPDA: PublicKey): Promise<ListaAnime> {
  return pg.program.account.listaAnime.fetch(listaPDA) as Promise<ListaAnime>;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  // ── Preámbulo ──────────────────────────────────────────────────────────────

  log("📌 Wallet:   " + pg.wallet.publicKey.toString());
  const balance = await pg.connection.getBalance(pg.wallet.publicKey);
  log(`💰 Balance:  ${(balance / web3.LAMPORTS_PER_SOL).toFixed(4)} SOL\n`);

  const [listaPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from("lista"), pg.wallet.publicKey.toBuffer()],
    pg.program.programId
  );
  log("📋 Lista PDA: " + listaPDA.toString());

  // ── Cleanup ────────────────────────────────────────────────────────────────

  const cuentaExistente = await pg.connection.getAccountInfo(listaPDA);
  if (cuentaExistente) {
    log("\n🧹 Cerrando lista previa...");
    await pg.program.methods
      .cerrarLista()
      .accounts({ owner: pg.wallet.publicKey, lista: listaPDA })
      .rpc();
    log("   ✅ Lista cerrada, rent devuelto al wallet");
  }

  // ── Test 1: crear lista ────────────────────────────────────────────────────

  log("\n🧪 Test 1: crearLista");
  const tx1 = await pg.program.methods
    .crearLista("Mi Lista Anime")
    .accounts({
      owner: pg.wallet.publicKey,
      lista: listaPDA,
      systemProgram: SystemProgram.programId,
    })
    .rpc();
  log("   ✅ OK — tx: " + tx1);

  let lista = await fetchLista(listaPDA);
  log(`   Nombre: ${lista.nombre}`);
  log(`   Animes: ${lista.animes.length}`);

  // ── Test 2: agregar animes ─────────────────────────────────────────────────

  log("\n🧪 Test 2: agregarAnime");
  const animesIniciales = [
    { nombre: "Solo Leveling", episodios: 13 },
    { nombre: "Mushoku Tensei", episodios: 23 },
    { nombre: "Re:Zero", episodios: 25 },
  ];

  for (const anime of animesIniciales) {
    await pg.program.methods
      .agregarAnime(anime.nombre, anime.episodios)
      .accounts({ owner: pg.wallet.publicKey, lista: listaPDA })
      .rpc();
    log(`   ✅ Agregado '${anime.nombre}'`);
  }

  lista = await fetchLista(listaPDA);
  log("   📖 Lista actual:");
  logAnimes(lista.animes);

  // ── Test 3: alternar visto ─────────────────────────────────────────────────

  log("\n🧪 Test 3: alternarVisto");

  await pg.program.methods
    .alternarVisto(new BN(0))
    .accounts({ owner: pg.wallet.publicKey, lista: listaPDA })
    .rpc();
  lista = await fetchLista(listaPDA);
  log(`   ✅ [0] '${lista.animes[0].nombre}' visto: ${lista.animes[0].visto}`);

  await pg.program.methods
    .alternarVisto(new BN(0))
    .accounts({ owner: pg.wallet.publicKey, lista: listaPDA })
    .rpc();
  lista = await fetchLista(listaPDA);
  log(
    `   ✅ [0] '${lista.animes[0].nombre}' visto: ${lista.animes[0].visto} (toggle de vuelta)`
  );

  // ── Test 4: eliminar anime ─────────────────────────────────────────────────

  log("\n🧪 Test 4: eliminarAnime");
  await pg.program.methods
    .eliminarAnime(new BN(1))
    .accounts({ owner: pg.wallet.publicKey, lista: listaPDA })
    .rpc();

  lista = await fetchLista(listaPDA);
  log("   ✅ Eliminado índice 1 (Mushoku Tensei)");
  log("   📖 Lista actual:");
  logAnimes(lista.animes);

  // ── Test 5: error IndiceInvalido ───────────────────────────────────────────

  log("\n🧪 Test 5: IndiceInvalido");
  try {
    await pg.program.methods
      .eliminarAnime(new BN(99))
      .accounts({ owner: pg.wallet.publicKey, lista: listaPDA })
      .rpc();
    log("   ❌ Debió haber fallado");
  } catch (e) {
    assertError(e, "IndiceInvalido", "Test 5");
  }

  // ── Test 6: error NombreMuyLargo ───────────────────────────────────────────

  log("\n🧪 Test 6: NombreMuyLargo");
  try {
    await pg.program.methods
      .agregarAnime("A".repeat(51), 12)
      .accounts({ owner: pg.wallet.publicKey, lista: listaPDA })
      .rpc();
    log("   ❌ Debió haber fallado");
  } catch (e) {
    assertError(e, "NombreMuyLargo", "Test 6");
  }

  // ── Test 7: error LimiteAnimesAlcanzado ────────────────────────────────────

  log("\n🧪 Test 7: LimiteAnimesAlcanzado");
  try {
    lista = await fetchLista(listaPDA);
    // Rellenar hasta 10 animes
    for (let i = lista.animes.length; i < 10; i++) {
      await pg.program.methods
        .agregarAnime(`Anime ${i}`, 12)
        .accounts({ owner: pg.wallet.publicKey, lista: listaPDA })
        .rpc();
    }
    // El undécimo debe fallar
    await pg.program.methods
      .agregarAnime("Anime Extra", 12)
      .accounts({ owner: pg.wallet.publicKey, lista: listaPDA })
      .rpc();
    log("   ❌ Debió haber fallado");
  } catch (e) {
    assertError(e, "LimiteAnimesAlcanzado", "Test 7");
  }

  // ── Test 8: cerrar lista ───────────────────────────────────────────────────

  log("\n🧪 Test 8: cerrarLista");
  const balanceAntes = await pg.connection.getBalance(pg.wallet.publicKey);

  await pg.program.methods
    .cerrarLista()
    .accounts({ owner: pg.wallet.publicKey, lista: listaPDA })
    .rpc();

  const balanceDespues = await pg.connection.getBalance(pg.wallet.publicKey);
  const rentDevuelto = (balanceDespues - balanceAntes) / web3.LAMPORTS_PER_SOL;
  log(`   ✅ Lista cerrada`);
  log(`   💰 Rent devuelto: ~${rentDevuelto.toFixed(4)} SOL`);

  const cuentaCerrada = await pg.connection.getAccountInfo(listaPDA);
  log(
    "   Cuenta existe: " +
      (cuentaCerrada !== null
        ? "❌ Sigue existiendo"
        : "✅ Cerrada correctamente")
  );

  log("\n🎉 Todos los tests completados.");
}

main().catch(console.error);
