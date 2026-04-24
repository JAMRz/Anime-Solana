# 📺 Lista de Anime — Programa Solana (Anchor)

Un smart contract escrito en Rust con el framework **Anchor** que permite a cada usuario crear y gestionar su propia lista de animes directamente en la blockchain de Solana.

---

## Descripción general

Cada wallet puede inicializar **una única lista** (PDA) donde almacenar hasta **10 animes**, con nombre, número de episodios y estado de visto/no visto. La lista puede cerrarse para recuperar el rent de la cuenta.

---

## Instrucciones del programa

### `crear_lista`

Inicializa la cuenta PDA `ListaAnime` para el `owner` que firma la transacción.

| Parámetro | Tipo     | Descripción                        |
|-----------|----------|------------------------------------|
| `nombre`  | `String` | Nombre de la lista (máx. 50 chars) |

**Validaciones:**
- El nombre no puede superar los 50 caracteres → `ErrorListaAnime::NombreMuyLargo`

**Accounts requeridas:** `CrearLista`

---

### `agregar_anime`

Agrega un anime al vector `animes` de la lista.

| Parámetro   | Tipo     | Descripción                         |
|-------------|----------|-------------------------------------|
| `nombre`    | `String` | Nombre del anime (máx. 50 chars)    |
| `episodios` | `u16`    | Número de episodios                 |

**Validaciones:**
- El nombre no puede superar los 50 caracteres → `ErrorListaAnime::NombreMuyLargo`
- La lista no puede tener más de 10 animes → `ErrorListaAnime::LimiteAnimesAlcanzado`

El campo `visto` se inicializa en `false` automáticamente.

**Accounts requeridas:** `ModificarLista`

---

### `alternar_visto`

Alterna el estado `visto` (`true`/`false`) del anime en la posición indicada.

| Parámetro | Tipo  | Descripción                     |
|-----------|-------|---------------------------------|
| `index`   | `u64` | Índice del anime en el vector   |

**Validaciones:**
- El índice debe estar dentro del rango del vector → `ErrorListaAnime::IndiceInvalido`

**Accounts requeridas:** `ModificarLista`

---

### `eliminar_anime`

Elimina el anime en la posición indicada del vector.

| Parámetro | Tipo  | Descripción                     |
|-----------|-------|---------------------------------|
| `index`   | `u64` | Índice del anime a eliminar     |

**Validaciones:**
- El índice debe estar dentro del rango del vector → `ErrorListaAnime::IndiceInvalido`

**Accounts requeridas:** `ModificarLista`

---

### `cerrar_lista`

Cierra la cuenta PDA y devuelve el lamport rent al `owner`.

**Accounts requeridas:** `CerrarLista`

---

## Contextos de cuentas (Account Contexts)

### `CrearLista`

| Cuenta          | Descripción                                                               |
|-----------------|---------------------------------------------------------------------------|
| `owner`         | Firmante y pagador del rent. Mutado.                                      |
| `lista`         | PDA inicializada con `seeds = ["lista", owner.key()]`. Espacio: `INIT_SPACE`. |
| `system_program`| Programa del sistema de Solana.                                           |

---

### `ModificarLista`

| Cuenta  | Descripción                                                               |
|---------|---------------------------------------------------------------------------|
| `owner` | Firmante. Verificado con `has_one = owner`.                               |
| `lista` | PDA existente derivada de `["lista", owner.key()]`. Mutada.               |

---

### `CerrarLista`

| Cuenta  | Descripción                                                                       |
|---------|-----------------------------------------------------------------------------------|
| `owner` | Firmante. Verificado con `has_one = owner`. Recibe el rent al cerrar la cuenta.  |
| `lista` | PDA existente. Se cierra con `close = owner`.                                    |

---

## Estructuras de datos

### `ListaAnime` (cuenta on-chain)

| Campo    | Tipo           | Descripción                              |
|----------|----------------|------------------------------------------|
| `owner`  | `Pubkey`       | Clave pública del dueño de la lista.     |
| `nombre` | `String`       | Nombre de la lista (máx. 50 chars).      |
| `animes` | `Vec<Anime>`   | Vector de animes (máx. 10 elementos).    |
| `bump`   | `u8`           | Bump seed del PDA.                       |

**PDA derivation:** `seeds = [b"lista", owner.key().as_ref()]`

---

### `Anime`

| Campo      | Tipo     | Descripción                           |
|------------|----------|---------------------------------------|
| `nombre`   | `String` | Nombre del anime (máx. 50 chars).     |
| `episodios`| `u16`    | Número de episodios del anime.        |
| `visto`    | `bool`   | Indica si el anime ya fue visto.      |

---

## Códigos de error

| Error                    | Código | Mensaje                              |
|--------------------------|--------|--------------------------------------|
| `NombreMuyLargo`         | 6000   | El nombre es demasiado largo.        |
| `IndiceInvalido`         | 6001   | Índice inválido.                     |
| `LimiteAnimesAlcanzado`  | 6002   | Se alcanzó el límite de animes.      |

---

El archivo `client.ts` contiene una suite de pruebas de integración ejecutable
desde **Solana Playground**. Cubre los siguientes escenarios:

| Test | Descripción |
|------|-------------|
| Test 1 | Crear la lista |
| Test 2 | Agregar animes |
| Test 3 | Alternar estado `visto` (doble toggle) |
| Test 4 | Eliminar anime por índice |
| Test 5 | Error `IndiceInvalido` al usar un índice fuera de rango |
| Test 6 | Error `NombreMuyLargo` al exceder 50 caracteres |
| Test 7 | Error `LimiteAnimesAlcanzado` al intentar agregar un undécimo anime |
| Test 8 | Cerrar lista y verificar devolución del rent |

Para ejecutarlo, abre el proyecto en [Solana Playground](https://beta.solpg.io),
asegúrate de tener SOL en devnet y corre el cliente desde la pestaña **Client**.

## Notas técnicas

- El espacio de la cuenta se calcula automáticamente con `#[derive(InitSpace)]` y las macros `#[max_len(...)]` de Anchor.
- Cada wallet puede tener **una sola lista** debido a que el PDA se deriva únicamente de la clave del owner.
- El campo `bump` se almacena en la cuenta para evitar recalcularlo en cada instrucción.
- Desarrollado y testeado en **Solana Playground**.

## Créditos

Proyecto desarrollado durante el bootcamp de **[Waylearn](https://www.waylearn.org/)**,
con el apoyo del agente **WaynIA-Solana**. La blockchain parece sencilla en la
superficie, pero la ingeniería detrás — PDAs, rent, serialización, validación de
cuentas — tiene una profundidad real. Este bootcamp no solo enseña a construir,
sino a entender los principios de cómo funciona todo por debajo.
