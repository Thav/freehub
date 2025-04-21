class Organizations::ServicesController < OrganizationController
  before_action :set_service, only: %i[ show edit update destroy ]
  before_action :set_page_title

  # GET /services or /services.json
  def index
    @services = @org.services
  end

  # GET /services/1 or /services/1.json
  def show
  end

  # GET /services/new
  def new
    @service = @org.services.build
  end

  # GET /services/1/edit
  def edit
  end

  # POST /services or /services.json
  def create
    @service = @org.services.build(service_params)

    respond_to do |format|
      if @service.save
        format.html { redirect_to organization_service_url(@org, @service), notice: 'Service was successfully created.' }
        format.json { render :show, status: :created, location: @service }
      else
        format.html { render :new, status: :unprocessable_entity }
        format.json { render json: @service.errors, status: :unprocessable_entity }
      end
    end
  end

  # PATCH/PUT /services/1 or /services/1.json
  def update
    respond_to do |format|
      if @service.update(service_params)
        format.html { redirect_to organization_service_url(@org, @service), notice: 'Service was successfully updated.' }
        format.json { render :show, status: :ok, location: @service }
      else
        format.html { render :edit, status: :unprocessable_entity }
        format.json { render json: @service.errors, status: :unprocessable_entity }
      end
    end
  end

  # DELETE /services/1 or /services/1.json
  def destroy
    @service.destroy

    respond_to do |format|
      format.html { redirect_to organization_services_url(@org), notice: "Service was successfully destroyed." }
      format.json { head :no_content }
    end
  end

  private
    # Use callbacks to share common setup or constraints between actions.
    def set_service
      @service = @org.services.find(params[:id])
    end

    # Only allow a list of trusted parameters through.
    def service_params
      params.require(:service).permit(:start_date, :end_date, :paid, :volunteered, :service_type, :note_id, :person_id)
    end

    def set_page_title
      @page_title = 'Services'
    end
end
