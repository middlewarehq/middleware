#!/bin/bash

CERT_DIR="./certificates"
CERT_KEY="$CERT_DIR/localhost.key"
CERT_CRT="$CERT_DIR/localhost.crt"

mkdir -p $CERT_DIR

# if already exists
if [[ -f "$CERT_KEY" && -f "$CERT_CRT" ]]; then
  echo "Certificate and key already exist. Skipping generation."
else
  echo "Generating new certificate and key..."

  # certificate generation
  openssl req -x509 -out $CERT_CRT -keyout $CERT_KEY \
    -days 365 \
    -newkey rsa:2048 -nodes -sha256 \
    -subj '/CN=localhost' -extensions EXT -config <(
      printf "[dn]\nCN=localhost\n[req]\ndistinguished_name = dn\n[EXT]\nsubjectAltName=DNS:localhost\nkeyUsage=digitalSignature\nextendedKeyUsage=serverAuth"
    )

  echo "Certificate and key generated successfully!"
fi
