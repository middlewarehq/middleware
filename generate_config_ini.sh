#!/usr/bin/env bash

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    key="$1"
    case $key in
        -t|--target)
        target_path="$2"
        shift 
        shift 
        ;;
        *)    
        echo "Unknown option: $1"
        exit 1
        ;;
    esac
done

# Check if target path is provided
if [ -z "$target_path" ]; then
    echo "Error: Please provide a target path using -t or --target."
    exit 1
fi

# Generate the RSA private key
private_key=$(openssl genrsa 2048)

# Extract the public key from the private key
public_key=$(echo "$private_key" | openssl rsa -pubout)

# Encode the keys in the desired format
private_key=$(echo -e "$private_key"| openssl base64 | tr -d '\n')
public_key=$(echo -e "$public_key" | openssl base64 | tr -d '\n')

# Create the config file
cat << EOF > "$target_path/config.ini"
[KEYS]
SECRET_PRIVATE_KEY=$private_key
SECRET_PUBLIC_KEY=$public_key
EOF

echo "Keys file created: $target_path/config.ini"
