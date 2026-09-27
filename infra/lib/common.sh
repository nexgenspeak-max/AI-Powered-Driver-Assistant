#!/usr/bin/env bash
# Shared helpers for infra/*.sh scripts.
# Source from repo root or any infra/ subdirectory.

if [[ -z "${INFRA_COMMON_LOADED:-}" ]]; then
  INFRA_COMMON_LOADED=1
  INFRA_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
  REPO_ROOT="$(cd "$INFRA_DIR/.." && pwd)"

  infra_root() {
    local dir
    dir="$(cd "$(dirname "${BASH_SOURCE[1]}")/.." && pwd)"
    echo "$dir"
  }

  repo_root() {
    local dir
    dir="$(cd "$(dirname "${BASH_SOURCE[1]}")/../.." && pwd)"
    echo "$dir"
  }

  # Portable in-place sed (macOS + Linux).
  sed_inplace() {
    if sed --version >/dev/null 2>&1; then
      sed -i "$@"
    else
      sed -i '' "$@"
    fi
  }

  require_cmd() {
    local cmd="$1"
    if ! command -v "$cmd" >/dev/null 2>&1; then
      echo "❌ Required command not found: $cmd" >&2
      exit 1
    fi
  }

  load_env_file() {
    local file="$1"
    if [[ ! -f "$file" ]]; then
      echo "❌ Env file not found: $file" >&2
      return 1
    fi
    set -a
    # shellcheck disable=SC1090
    source "$file"
    set +a
  }

  aws_profile_args() {
    if [[ -n "${AWS_PROFILE:-}" ]]; then
      echo "--profile" "$AWS_PROFILE"
    fi
  }

  # Stack name = <env>-driver-assistant-<service folder> (see infra/README.md naming).
  stack_name() {
    local service="$1"
    local env="${2:-${ENV:-dev}}"
    echo "${env}-driver-assistant-${service}"
  }

  stack_exists() {
    local name="$1"
    local region="${AWS_REGION:-ap-southeast-1}"
    aws cloudformation describe-stacks \
      --stack-name "$name" \
      --region "$region" \
      $(aws_profile_args) \
      >/dev/null 2>&1
  }

  stack_output() {
    local name="$1"
    local key="$2"
    local region="${AWS_REGION:-ap-southeast-1}"
    aws cloudformation describe-stacks \
      --stack-name "$name" \
      --region "$region" \
      $(aws_profile_args) \
      --query "Stacks[0].Outputs[?OutputKey=='${key}'].OutputValue | [0]" \
      --output text 2>/dev/null || true
  }

  # Set or append KEY=VALUE in an env file (never prints the value).
  set_env_var() {
    local file="$1"
    local key="$2"
    local value="$3"
    local tmp
    tmp="$(mktemp)"
    if [[ -f "$file" ]] && grep -q "^${key}=" "$file"; then
      awk -v k="$key" -v v="$value" '
        BEGIN { FS="="; OFS="=" }
        $1 == k { print k, v; next }
        { print }
      ' "$file" >"$tmp"
      mv "$tmp" "$file"
    else
      echo "${key}=${value}" >>"$file"
    fi
  }

  check_aws_credentials() {
    require_cmd aws
    if ! aws sts get-caller-identity $(aws_profile_args) >/dev/null 2>&1; then
      echo "❌ AWS credentials not configured. Run: aws configure --profile <name>" >&2
      echo "   Then: export AWS_PROFILE=<name>" >&2
      exit 1
    fi
  }

  check_deploy_prereqs() {
    local need_docker="${1:-false}"
    check_aws_credentials
    require_cmd sam
    if [[ "$need_docker" == "true" ]]; then
      require_cmd docker
      if ! docker info >/dev/null 2>&1; then
        echo "❌ Docker is not running. Start Docker Desktop first." >&2
        exit 1
      fi
    fi
  }

  print_header() {
    echo "======================================"
    echo " $1"
    echo " Environment : ${ENV:-dev}"
    echo " Region      : ${AWS_REGION:-ap-southeast-1}"
    echo " Profile     : ${AWS_PROFILE:-default}"
    echo "======================================"
  }

  discover_default_vpc() {
    aws ec2 describe-vpcs \
      $(aws_profile_args) \
      --region "${AWS_REGION:-ap-southeast-1}" \
      --filters Name=isDefault,Values=true \
      --query 'Vpcs[0].VpcId' \
      --output text
  }

  discover_public_subnets() {
    local vpc_id="$1"
    aws ec2 describe-subnets \
      $(aws_profile_args) \
      --region "${AWS_REGION:-ap-southeast-1}" \
      --filters "Name=vpc-id,Values=${vpc_id}" "Name=map-public-ip-on-launch,Values=true" \
      --query 'Subnets[*].SubnetId' \
      --output text | tr '\t' ','
  }

fi
