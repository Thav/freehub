require "digest"
require "json"

namespace :freehub do
  desc "Persist sanitized FH-005 preflight accounting without retaining source rows"
  task :record_preflight, [:path] => :environment do |_task, args|
    path = args[:path] || ENV.fetch("PREFLIGHT_REPORT")
    bytes = File.binread(path)
    report = JSON.parse(bytes)
    run = MigrationRun.create!(
      source_sha256: report.fetch("source").fetch("sha256"),
      contract_version: report.fetch("contractVersion"),
      started_at: Time.current
    )
    report.fetch("tables").each do |table|
      table.fetch("quarantineCategories").each do |category, count|
        next if count.to_i.zero?
        MigrationIssue.create!(
          migration_run: run,
          source_table: table.fetch("sourceTable"),
          category: category,
          disposition: "quarantined",
          payload_fingerprint: Digest::SHA256.hexdigest("#{table.fetch('sourceTable')}:#{category}:#{count}"),
          sanitized_detail: { "count" => count }
        )
      end
    end
    run.update!(completed_at: Time.current, report_sha256: Digest::SHA256.hexdigest(bytes))
    puts "recorded migration run #{run.id} from #{run.source_sha256}"
  end
end
