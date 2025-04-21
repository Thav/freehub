require 'exports/visits_export'

class Organizations::Reports::VisitsController < OrganizationController
  include Pagination

  before_action :set_page_title
  before_action :set_visits

  def index
    @visits, @pagination = paginate(@visits)
  end

  def export
    respond_to do |format|
      format.csv do
        send_data Exports::VisitsExport.new(@visits).to_csv, filename: "#{@org.slug}-visits-export-#{Time.now.strftime('%F')}.csv"
      end
    end
  end

  private

  def set_visits
    @visits = @org.visits

    if params[:start_date].present?
      @visits = @visits.where(Visit.arel_table[:arrived_at].gteq(params[:start_date]))
    end

    if params[:end_date].present?
      @visits = @visits.where(Visit.arel_table[:arrived_at].lteq(params[:end_date]))
    end
  end

  def set_page_title
    @page_title = "Visits Report"
  end
end
