#!/bin/bash
# Where a Mongo dump goes besides the server it was made on (sourced by scripts/backup-mongo.sh).
#
# One setting, MONGO_BACKUP_REMOTE, written by the deploy into ~/db-backups/.remote.env (0600):
#   (empty)                      — nowhere else: the dump stays in ~/db-backups only (the default);
#   s3://bucket[/prefix]         — any S3-compatible storage (AWS, R2, Yandex Object Storage, MinIO):
#                                  MONGO_BACKUP_S3_ENDPOINT, MONGO_BACKUP_S3_REGION,
#                                  MONGO_BACKUP_S3_ACCESS_KEY_ID, MONGO_BACKUP_S3_SECRET_ACCESS_KEY;
#   sftp://user@host[:port]/path — another server: MONGO_BACKUP_SFTP_KEY_PEM (private key, one line
#                                  with literal \n), optional MONGO_BACKUP_SFTP_KNOWN_HOSTS_FILE.
#
# The copy is made by a throwaway rclone container. Its configuration goes in as an --env-file, so
# no key ever appears in `ps` on the host or in the container's argv.

# Pinned by digest: this image gets the storage keys.
RCLONE_IMAGE="${RCLONE_IMAGE:-rclone/rclone:1.71.2@sha256:3103526c506266a9ecdf064efe99bf3677d92ef6407af124d8c56b4f49cbaa51}"

# Writes rclone's env configuration of the remote `dest` into $1 and prints the target directory
# (`dest:bucket/prefix`). Returns 2 when no remote is configured, 1 on an invalid setting.
backup_remote_rclone_env() {
    local out=$1 remote="${MONGO_BACKUP_REMOTE:-}" rest bucket_path userhost hostport user host port path

    [ -z "$remote" ] && return 2

    case "$remote" in
        s3://*)
            bucket_path="${remote#s3://}"
            bucket_path="${bucket_path%/}"
            if [ -z "$bucket_path" ] || [ "${bucket_path#/}" != "$bucket_path" ]; then
                echo "MONGO_BACKUP_REMOTE: s3://<bucket>[/prefix] expected, got '$remote'" >&2
                return 1
            fi
            if [ -z "${MONGO_BACKUP_S3_ACCESS_KEY_ID:-}" ] || [ -z "${MONGO_BACKUP_S3_SECRET_ACCESS_KEY:-}" ]; then
                echo "MONGO_BACKUP_REMOTE is s3 but MONGO_BACKUP_S3_ACCESS_KEY_ID / MONGO_BACKUP_S3_SECRET_ACCESS_KEY are empty" >&2
                return 1
            fi
            (
                umask 077
                {
                    echo "RCLONE_CONFIG_DEST_TYPE=s3"
                    # `Other` speaks plain S3 to any endpoint; without an endpoint it is AWS itself.
                    if [ -n "${MONGO_BACKUP_S3_ENDPOINT:-}" ]; then
                        echo "RCLONE_CONFIG_DEST_PROVIDER=Other"
                        echo "RCLONE_CONFIG_DEST_ENDPOINT=${MONGO_BACKUP_S3_ENDPOINT}"
                    else
                        echo "RCLONE_CONFIG_DEST_PROVIDER=AWS"
                    fi
                    [ -n "${MONGO_BACKUP_S3_REGION:-}" ] && echo "RCLONE_CONFIG_DEST_REGION=${MONGO_BACKUP_S3_REGION}"
                    echo "RCLONE_CONFIG_DEST_ACCESS_KEY_ID=${MONGO_BACKUP_S3_ACCESS_KEY_ID}"
                    echo "RCLONE_CONFIG_DEST_SECRET_ACCESS_KEY=${MONGO_BACKUP_S3_SECRET_ACCESS_KEY}"
                    # A key limited to writing objects cannot create or even check the bucket.
                    echo "RCLONE_CONFIG_DEST_NO_CHECK_BUCKET=true"
                } > "$out"
            )
            echo "dest:${bucket_path}"
            ;;
        sftp://*)
            rest="${remote#sftp://}"
            userhost="${rest%%/*}"
            path="${rest#"$userhost"}"
            path="${path%/}"
            user="${userhost%%@*}"
            hostport="${userhost#*@}"
            host="${hostport%%:*}"
            port=22
            [ "$hostport" != "$host" ] && port="${hostport#*:}"
            if [ "$user" = "$userhost" ] || [ -z "$user" ] || [ -z "$host" ] || [ -z "$path" ] || ! [[ "$port" =~ ^[0-9]+$ ]]; then
                echo "MONGO_BACKUP_REMOTE: sftp://<user>@<host>[:port]/<path> expected, got '$remote'" >&2
                return 1
            fi
            if [ -z "${MONGO_BACKUP_SFTP_KEY_PEM:-}" ]; then
                echo "MONGO_BACKUP_REMOTE is sftp but MONGO_BACKUP_SFTP_KEY_PEM is empty (password login is not supported)" >&2
                return 1
            fi
            (
                umask 077
                {
                    echo "RCLONE_CONFIG_DEST_TYPE=sftp"
                    echo "RCLONE_CONFIG_DEST_HOST=${host}"
                    echo "RCLONE_CONFIG_DEST_PORT=${port}"
                    echo "RCLONE_CONFIG_DEST_USER=${user}"
                    echo "RCLONE_CONFIG_DEST_KEY_PEM=${MONGO_BACKUP_SFTP_KEY_PEM}"
                    # A plain SFTP account usually has no shell for md5sum; size is still verified.
                    echo "RCLONE_CONFIG_DEST_DISABLE_HASHCHECK=true"
                    [ -n "${MONGO_BACKUP_SFTP_KNOWN_HOSTS_FILE:-}" ] && echo "RCLONE_CONFIG_DEST_KNOWN_HOSTS_FILE=/config/known_hosts"
                } > "$out"
            )
            # `dest:/abs/path` — rclone takes an sftp path from the server root when it starts with /.
            echo "dest:${path}"
            ;;
        *)
            echo "MONGO_BACKUP_REMOTE: unsupported '$remote' (s3://… or sftp://…)" >&2
            return 1
            ;;
    esac
}
