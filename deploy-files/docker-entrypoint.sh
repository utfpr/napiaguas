#!/bin/bash
set -e

# Criar diretórios de dados se não existirem
mkdir -p /workspace/data/dados /workspace/data/gpkg

# Ajustar permissões para o usuário napiaguas
chown -R napiaguas:napiaguas /workspace/data

# Executar comando como usuário napiaguas
exec gosu napiaguas "$@"
