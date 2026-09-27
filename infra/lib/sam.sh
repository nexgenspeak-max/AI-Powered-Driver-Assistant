#!/usr/bin/env bash
# Shared build/deploy/teardown for the SAM service stacks. Source after lib/common.sh.
#   Stack name: <env>-driver-assistant-<service> (same as the folder name).

APP_NAME="driver-assistant"

# load_service_env <service> <env> — exports the service's envs/.env.<env>
load_service_env() {
  local service="$1" env="$2"
  local file="$REPO_ROOT/src/backend/${service}/envs/.env.${env}"
  if [[ ! -f "$file" ]]; then
    echo "❌ Env file not found: $file (run: bash infra/setup-env.sh $env)" >&2
    exit 1
  fi
  load_env_file "$file"
  export ENV="$env"
}

# require_vars VAR... — fail fast with the missing names
require_vars() {
  local missing=()
  for v in "$@"; do [[ -n "${!v:-}" ]] || missing+=("$v"); done
  if [[ ${#missing[@]} -gt 0 ]]; then
    echo "❌ Missing in env file: ${missing[*]}" >&2
    exit 1
  fi
}

# sam_deploy_stack <service> Key=Value... — optional params with empty values are dropped
# (SAM rejects "Key=") so the template Default applies.
sam_deploy_stack() {
  local service="$1"; shift
  local env="${ENV:-dev}"
  local stack region bucket dir
  stack="$(stack_name "$service" "$env")"
  region="${AWS_REGION:-ap-southeast-1}"
  bucket="${env}-${APP_NAME}-sam-artifacts"
  dir="$INFRA_DIR/$service"
  local params=(Environment="$env" AppName="$APP_NAME")
  for kv in "$@"; do [[ -n "${kv#*=}" ]] && params+=("$kv"); done

  print_header "$service — SAM deploy (stack $stack)"
  aws s3 mb "s3://$bucket" --region "$region" $(aws_profile_args) >/dev/null 2>&1 || true
  # esbuild is a devDependency of each service; SAM needs it on PATH to bundle.
  (cd "$REPO_ROOT/src/backend/$service" && npm install --no-audit --no-fund >/dev/null)
  PATH="$REPO_ROOT/src/backend/$service/node_modules/.bin:$PATH" \
    sam build --template "$dir/sam.yaml" --build-dir "$dir/.aws-sam/build" --region "$region"
  sam deploy \
    --template-file "$dir/.aws-sam/build/template.yaml" \
    --stack-name "$stack" \
    --s3-bucket "$bucket" \
    --region "$region" \
    --capabilities CAPABILITY_IAM \
    --no-fail-on-empty-changeset \
    $(aws_profile_args) \
    --parameter-overrides "${params[@]}"
}

# teardown_stack <service> — deletes the stack; tables with DeletionPolicy Retain survive
teardown_stack() {
  local service="$1"
  local stack region
  stack="$(stack_name "$service" "${ENV:-dev}")"
  region="${AWS_REGION:-ap-southeast-1}"
  echo "⚠️  $stack will be deleted. DynamoDB tables are RETAINED."
  if [[ "${TEARDOWN_AUTO_YES:-}" != "1" ]]; then
    read -r -p "Delete $stack? (yes/no): " confirm
    [[ "$confirm" == "yes" ]] || { echo "Aborted."; return 0; }
  fi
  aws cloudformation delete-stack --stack-name "$stack" --region "$region" $(aws_profile_args)
  aws cloudformation wait stack-delete-complete --stack-name "$stack" --region "$region" $(aws_profile_args)
  echo "✅ $stack deleted."
}
