#!/usr/bin/env bash
# =============================================================================
# GitLab Runner 一次性部署脚本（宿主 192.168.150.10 上以 root 执行）
#
# 作用：
#   1) 停掉 GitLab 容器内跑的旧 runner（避免两个 runner 抢任务）
#   2) 启动独立 runner 容器（挂载 /var/run/docker.sock，配置落宿主目录，可持久化）
#   3) 用 project runner token 非交互注册（docker executor + socket + compose）
#
# 用法：
#   sudo bash scripts/setup-gitlab-runner.sh <glrt-token> [gitlab_url] [network]
# 例：
#   sudo bash scripts/setup-gitlab-runner.sh glrt-AbCdEf123456 http://192.168.150.10:7080 dshiq04
#
# 可选环境变量：
#   RUNNER_NAME   默认 dshiq04-docker
#   CONF_DIR      默认 /root/docker_files/gitlab-runner/config
#   GITLAB_CONTAINER 默认 gitlab
#   RUNNER_IMAGE  默认 gitlab/gitlab-runner:latest
# =============================================================================
set -euo pipefail

TOKEN="${1:-}"
if [ -z "$TOKEN" ]; then
  echo "用法: $0 <glrt-token> [gitlab_url] [docker_network]" >&2
  exit 1
fi

GITLAB_URL="${2:-http://192.168.150.10:7080}"
NETWORK="${3:-dshiq04}"
RUNNER_NAME="${RUNNER_NAME:-dshiq04-docker}"
CONF_DIR="${CONF_DIR:-/root/docker_files/gitlab-runner/config}"
GITLAB_CONTAINER="${GITLAB_CONTAINER:-gitlab}"
RUNNER_IMAGE="${RUNNER_IMAGE:-gitlab/gitlab-runner:latest}"

command -v docker >/dev/null 2>&1 || { echo "未安装 docker" >&2; exit 1; }
docker info >/dev/null 2>&1 || { echo "无法访问 docker 守护进程（用 root 或加入 docker 组）" >&2; exit 1; }

echo ">>> 1/5 停止 GitLab 容器（$GITLAB_CONTAINER）内的旧 runner"
if docker inspect "$GITLAB_CONTAINER" >/dev/null 2>&1; then
  docker exec "$GITLAB_CONTAINER" sh -lc 'pkill -f "gitlab-runner run" || true' >/dev/null 2>&1 || true
  echo "    已尝试停止（残留配置目录 /root/.gitlab-runner 可留可删，不影响新 runner）"
else
  echo "    未找到容器 $GITLAB_CONTAINER，跳过"
fi

echo ">>> 2/5 准备网络与配置目录"
docker network inspect "$NETWORK" >/dev/null 2>&1 || {
  echo "    创建网络 $NETWORK"
  docker network create "$NETWORK" >/dev/null
}
mkdir -p "$CONF_DIR"

echo ">>> 3/5 启动 runner 容器"
docker rm -f gitlab-runner >/dev/null 2>&1 || true
docker run -d --name gitlab-runner --restart always \
  --network "$NETWORK" \
  -v "$CONF_DIR:/etc/gitlab-runner" \
  -v /var/run/docker.sock:/var/run/docker.sock \
  "$RUNNER_IMAGE" >/dev/null
echo "    配置目录: $CONF_DIR"

echo ">>> 4/5 注册 runner（token 认证，非交互）"
docker exec gitlab-runner gitlab-runner register --non-interactive \
  --url "$GITLAB_URL" \
  --token "$TOKEN" \
  --name "$RUNNER_NAME" \
  --executor "docker" \
  --docker-image "docker:27-cli" \
  --docker-privileged=false \
  --docker-volumes "/var/run/docker.sock:/var/run/docker.sock" \
  --docker-volumes "/cache" \
  --docker-pull-policy "if-not-present" \
  --docker-network-mode "$NETWORK"

echo ">>> 5/5 生成的配置（重点检查 volumes / pull_policy）"
sed -n '1,60p' "$CONF_DIR/config.toml"
echo "----- runner 日志 -----"
docker logs --tail 15 gitlab-runner 2>&1 || true

echo
echo "下一步："
echo "  1. GitLab → 项目 Settings → CI/CD → Runners，确认 '$RUNNER_NAME' 显示绿色 online"
echo "  2. 删除/暂停旧的 192.168.150.10 runner（避免任务被旧 runner 领走）"
echo "  3. 重跑流水线，首行日志应为: Using effective pull policy of [if-not-present]"
