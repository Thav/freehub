require 'exports/services_export'

class Organizations::Reports::ServicesController < OrganizationController
  include Pagination
  before_action :set_page_title
  before_action :set_services

  def index
    @services, @pagination = paginate(@services)
  end

  def export
    respond_to do |format|
      format.csv do
        send_data Exports::ServicesExport.new(@services).to_csv, filename: "#{@org.slug}-services-export-#{Time.now.strftime('%F')}.csv"
      end
    end
  end

  private

  def set_services
    @services = @org.services

    if params[:start_date].present?
      @services = @services.where( Service.arel_table[:end_date].lteq(params[:start_date]) )
    end

    if params[:end_date].present?
      @services = @services.where( Service.arel_table[:start_date].gteq(params[:end_date]) )
    end

    if params[:service_type].present?
      @services = @services.where(service_type: params[:service_type])
    end
  end

  def set_page_title
    @page_title = "Services Report"
  end
end
