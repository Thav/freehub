class Organizations::PeopleController < OrganizationController
  before_action :set_person, only: %i[ show edit update destroy ]
  before_action :set_page_title

  # GET /people or /people.json
  def index
    @people = @org.people
    #Only respond to json requests
    respond_to do |format|
      format.json { render json: @people }
    end
  end

  # GET /people/1 or /people/1.json
  def show
  end

  # GET /people/new
  def new
    @person = @org.people.build
  end

  # GET /people/1/edit
  def edit
  end

  # POST /people or /people.json
  def create
    @person = @org.people.build(person_params)

    respond_to do |format|
      if @person.save
        format.html { redirect_to organization_person_url(@org, @person), notice: 'Person was successfully created.' }
        format.json { render :show, status: :created, location: @person }
      else
        format.html { render :new, status: :unprocessable_entity }
        format.json { render json: @person.errors, status: :unprocessable_entity }
      end
    end
  end

  # PATCH/PUT /people/1 or /people/1.json
  def update
    respond_to do |format|
      if @person.update(person_params)
        format.html { redirect_to organization_person_url(@org, @person), notice: 'Person was successfully updated.' }
        format.json { render :show, status: :ok, location: @person }
      else
        format.html { render :edit, status: :unprocessable_entity }
        format.json { render json: @person.errors, status: :unprocessable_entity }
      end
    end
  end

  # DELETE /people/1 or /people/1.json
  def destroy
    @person.destroy

    respond_to do |format|
      format.html { redirect_to organization_people_url(@org), notice: "Person was successfully destroyed." }
      format.json { head :no_content }
    end
  end

  private
    # Use callbacks to share common setup or constraints between actions.
    def set_person
      @person = @org.people.find(params[:id])
    end

    # Only allow a list of trusted parameters through.
    def person_params
      params.require(:person).permit(:first_name, :last_name, :country, :address, :email, :email_opt_out, :phone, :organization_id)
    end

    def set_page_title
      @page_title = 'People'
    end
end
