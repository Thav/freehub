class ReportsController < ApplicationController
  before_action :require_user
  def people
    rows = organization.people.order(:display_name).pluck(:id, :display_name, :archived_at)
    render plain: (["id,display_name,archived"] + rows.map { |id, name, archived| [id, name.inspect, archived.present?].join(",") }).join("\n") + "\n", content_type: "text/csv", disposition: "attachment"
  end
end
