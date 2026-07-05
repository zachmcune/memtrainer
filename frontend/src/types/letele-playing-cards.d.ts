// The @letele/playing-cards package ships as a single ESM bundle with one named
// export per card (e.g. C4, Sa, Hq, B1). It has no type definitions, so we treat
// it as an untyped module and index into it by asset key at runtime.
declare module '@letele/playing-cards';
