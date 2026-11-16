// Таблица вердиктов гейта scripts/guard-external.sh — она же его документация: читая её, видно,
// что именно он ловит. Гейт целиком собран из регэкспов, которые ломаются от любой правки
// незаметно; ложное срабатывание не менее опасно, чем пропуск — агент начнёт переписывать
// команды, и гейт перестанет ловить что-либо.
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'

const guard = join(dirname(fileURLToPath(import.meta.url)), 'guard-external.sh')

/** 0 — разрешено, 2 — запрещено. Любой другой код Claude Code трактует как «не блокировать». */
const verdict = (command) => {
  const run = spawnSync('bash', [guard], { input: JSON.stringify({ tool_name: 'Bash', tool_input: { command } }), encoding: 'utf8' })
  assert.ok(run.status === 0 || run.status === 2, `гейт вернул ${run.status}: этот код не блокирует. ${run.stderr}`)
  return run.status
}

const DENY = [
  // выкатка в прод
  'git push',
  'git push origin',
  'git push -u origin HEAD',
  'git push origin @',
  'git push --all',
  'git push --mirror',
  'git push origin --tags',
  'git push origin --delete feat/x',
  'git push origin main',
  'git push -u origin main',
  'git push origin HEAD:main',
  'git push origin HEAD:refs/heads/main',
  'git -C . push origin main',
  'git --no-pager push origin main',
  'sudo git push origin main',
  'FOO=1 git push origin main',
  'cd x && git push origin main',
  'git push origin main; echo done',
  'git push --force origin develop',
  'git push -f origin feat/x',
  'git push --force-with-lease origin develop',
  'git push origin +feat/x',
  'gh pr merge 12 --squash',
  'gh api -X POST repos/o/r/issues -f title=x',
  'gh api repos/o/r/issues -f title=x',
  'gh api repos/o/r/issues --input body.json',
  'gh api --method DELETE repos/o/r/issues/1',
  'gh workflow run prod-deploy.yml',
  'gh release create v1.0.0',
  'gh secret set TG_TOKEN',
  'gh variable delete X',
  'gh repo delete o/r',
  // тома, cron, бэкапы
  'docker volume rm app_mongo_data',
  'docker volume prune -f',
  'docker -H ssh://srv volume rm x',
  'docker compose -f docker-compose.prod.yml down -v',
  'docker-compose down --volumes',
  'docker system prune -a --volumes -f',
  'docker system prune',
  'crontab -r',
  'rclone purge remote:backups',
  'rclone sync ~/db-backups remote:backups',
  'aws s3 rm s3://bucket/backups/x',
  'rm -rf /var/backups/mongo',
  'rm -rf ~/db-backups',
  'rm -f ~/db-backups/mongo_prod_1.archive.gz',
  // база и боевое окружение
  'scripts/restore-mongo.sh dump.gz',
  'bash scripts/restore-mongo.sh',
  './scripts/restore-mongo.sh latest',
  'mongorestore --drop dump',
  'docker exec mongo mongorestore /dump',
  'mongosh --eval "db.dropDatabase()"',
  'cat .env.prod',
  'cat .env.stage',
  'cp .env.prod /tmp/x',
  'env-cmd -f .env.prod next start',
  'pnpm build:prod',
  'pnpm doctor:prod',
  'pnpm run build:stage',
  'npm run worker:prod',
  // обёртки
  "ssh deploy@srv 'git push origin main'",
  'ssh deploy@srv "docker compose down -v"',
  'bash -c "git push origin main"',
  'eval "git push origin main"',
  "ssh srv 'crontab -r'",
]

const ALLOW = [
  // push с явной веткой назначения
  'git push origin feat/agent-gate',
  'git push -u origin feat/agent-gate',
  'git push origin HEAD:feat/x',
  'git push --no-verify origin fix/x',
  'cd x && git push -u origin chore/maintenance',
  'git push origin feat/main-menu',
  'git push origin release/main-2026',
  // gh: чтение и PR
  'gh pr create --base develop --fill',
  'gh pr edit 46 --body-file body.md',
  'gh pr view 46 --json title',
  'gh api repos/o/r/pulls --jq .[].number',
  'gh run list --workflow=lighthouse.yml',
  'gh run download 1 -n lighthouse-results',
  // слова push / prod / drop в невинных позициях
  'git commit -m "add push subscription"',
  'git commit -m "feat: add push subscription endpoint"',
  'git stash push -m wip',
  'git log --grep "push to main"',
  'git log --oneline | grep -i push',
  'echo "docs mention git push in prose"',
  'grep build:prod package.json',
  'grep -rn dropDatabase docs/',
  'rg dropDatabase lib/',
  'ls .env.production',
  'cat .env.example',
  'cat scripts/restore-mongo.sh',
  'git diff -- scripts/restore-mongo.sh',
  'pnpm build:local',
  'pnpm test',
  'npm run lint',
  'make up-local',
  // docker и cron без разрушения
  'docker compose -f docker-compose.local.yml up -d',
  'docker compose down',
  'docker volume create letsencrypt_certs',
  'docker volume ls | grep mongo',
  'docker image prune -f',
  'crontab -l',
  'rm -rf .next',
  'rm -rf node_modules',
  'ls ~/db-backups',
  'ls -la',
  'git status',
]

for (const command of DENY) test(`запрещено: ${command}`, () => assert.equal(verdict(command), 2))
for (const command of ALLOW) test(`разрешено: ${command}`, () => assert.equal(verdict(command), 0))

test('не-Bash событие пропускается', () => {
  const run = spawnSync('bash', [guard], { input: JSON.stringify({ tool_name: 'Read', tool_input: { file_path: '.env.prod' } }), encoding: 'utf8' })
  assert.equal(run.status, 0)
})

test('пустое и битое событие — запрет (fail closed внутри скрипта)', () => {
  assert.equal(spawnSync('bash', [guard], { input: '', encoding: 'utf8' }).status, 2)
  assert.equal(spawnSync('bash', [guard], { input: 'не json', encoding: 'utf8' }).status, 2)
})
