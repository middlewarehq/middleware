{ pkgs ? import <nixpkgs> {} }:

pkgs.mkShell {
  buildInputs = [ pkgs.ansible ];
  shellHook = ''
    export LC_ALL=C.UTF-8
    export LANG=C.UTF-8
  '';
}
