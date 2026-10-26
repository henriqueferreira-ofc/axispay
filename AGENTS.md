# Architecture Decisions

- Use responsive card layouts for bank statement data below the `md` breakpoint because wide financial tables clip critical amounts and actions on phones.
- Use deterministic art-directed authentication imagery by viewport because random backgrounds create inconsistent framing and hydration-dependent presentation.
- Return the library's typed JSON WebAuthn options from server functions rather than unknown-valued records because TanStack validates serializable response types.