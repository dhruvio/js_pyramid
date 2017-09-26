{ pkgs ? import <nixpkgs> {} }:

with pkgs;

stdenv.mkDerivation {
  name = "pyramid-env";
  buildInputs = [
    nodejs
  ];
}

