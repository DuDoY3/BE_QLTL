# SPDX-License-Identifier: Unlicense
{
  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixpkgs-unstable";

    # Support a particular subset of the Nix systems
    # systems.url = "github:nix-systems/default";
  };

  outputs =
    { nixpkgs, ... }:
    let
      eachSystem =
        f:
        nixpkgs.lib.genAttrs nixpkgs.lib.systems.flakeExposed (system: f nixpkgs.legacyPackages.${system});
    in
    {
      devShells = eachSystem (pkgs: {
        default = pkgs.mkShell {
          packages = [
            pkgs.nodejs

            # Alternatively, you can use a specific major version of Node.js

            # pkgs.nodejs-22_x

            # Use corepack to install npm/pnpm/yarn as specified in package.json
            pkgs.corepack

            pkgs.prisma-engines

            # To install a specific alternative package manager directly,
            # comment out one of these to use an alternative package manager.

            # pkgs.yarn
            # pkgs.pnpm
            # pkgs.bun

            # Required to enable the language server
            pkgs.nodePackages.typescript
            pkgs.nodePackages.typescript-language-server

            # Python is required on NixOS if the dependencies require node-gyp

            # pkgs.python3

            pkgs.vscode-langservers-extracted
            pkgs.prettierd
            pkgs.nodePackages.prettier
          ];
          shellHook = ''
            export PATH="./node_modules/.bin:$PATH"

            export PRISMA_SCHEMA_ENGINE_BINARY="${pkgs.prisma-engines}/bin/schema-engine"
            export PRISMA_QUERY_ENGINE_BINARY="${pkgs.prisma-engines}/bin/query-engine"
            export PRISMA_FMT_BINARY="${pkgs.prisma-engines}/bin/prisma-fmt"

            pnpm install
          '';
        };

      });
    };
}
