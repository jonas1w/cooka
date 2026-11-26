# AGPL-3.0, one multi-arch image on GHCR, semver

cooka is licensed **AGPL-3.0**. It ships as one multi-arch container image (amd64 and arm64, so it runs on a Raspberry Pi) on GitHub Container Registry, tagged by semver: `1.2.3`, `1.2`, `1` and `latest`. A **major** version means a break of the stable surface (ADR 0015) or a schema change that cannot be restored backwards; everything else is minor or patch.

We chose AGPL over MIT because cooka is a self-hosted web app: under MIT someone could run a modified cooka as a hosted service without sharing their changes, while AGPL requires that and costs a household self-hosting it nothing. This matches the neighbouring projects (Mealie, Tandoor; Grocy is MIT). A licence is hard to change once outside contributions arrive, which is why it is fixed before the first line of code.

## Consequences

- Every source file and the image carry the AGPL-3.0 notice; contributions come under the same licence.
- CI runs tests and the i18n catalog check from the first milestone; the release workflow (multi-arch build, GHCR push, tags) is built in the last v1 milestone.
