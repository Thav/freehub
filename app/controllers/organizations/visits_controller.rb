class Organizations::VisitsController < OrganizationController
  before_action :set_visit, only: %i[ show edit update destroy ]
  before_action :set_page_title

  # GET /visits or /visits.json
  def index
    # Parse date from params
    #   * If no date is provided, use today
    @current_date = params.key?(:date) ? Date.parse(params[:date]) : Date.today
    @next_date = @org.visits.where.not(start_at: nil).where(start_at: ..@current_date).order(:start_at).last.start_at.to_date
    @visits = @org.visits.where(start_at: @current_date.beginning_of_day..@current_date.end_of_day)
  end

  # GET /visits/1 or /visits/1.json
  def show
  end

  # GET /visits/new
  def new
    @visit = @org.visits.build
  end

  # GET /visits/1/edit
  def edit
  end

  # POST /visits or /visits.json
  def create
    @visit = @org.visits.build(visit_params)

    respond_to do |format|
      if @visit.save
        format.html { redirect_to visit_url(@visit), notice: "Visit was successfully created." }
        format.json { render :show, status: :created, location: @visit }
      else
        format.html { render :new, status: :unprocessable_entity }
        format.json { render json: @visit.errors, status: :unprocessable_entity }
      end
    end
  end

  # PATCH/PUT /visits/1 or /visits/1.json
  def update
    respond_to do |format|
      if @visit.update(visit_params)
        format.html { redirect_to visit_url(@visit), notice: "Visit was successfully updated." }
        format.json { render :show, status: :ok, location: @visit }
      else
        format.html { render :edit, status: :unprocessable_entity }
        format.json { render json: @visit.errors, status: :unprocessable_entity }
      end
    end
  end

  # DELETE /visits/1 or /visits/1.json
  def destroy
    @visit.destroy

    respond_to do |format|
      format.html { redirect_to visits_url, notice: "Visit was successfully destroyed." }
      format.json { head :no_content }
    end
  end

  private
    # Use callbacks to share common setup or constraints between actions.
    def set_visit
      @visit = @org.visits.find(params[:id])
    end

    # Only allow a list of trusted parameters through.
    def visit_params
      params.require(:visit).permit(:note_id, :volunteer, :arrived_at, :start_at, :end_at)
    end

    def set_page_title
      @page_title = 'Visits'
    end
end
