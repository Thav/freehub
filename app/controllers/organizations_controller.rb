class OrganizationsController < ApplicationController
  before_action :authenticate_user!, except: :index
  before_action :set_organization, only: %i[ show edit update destroy ]

  # GET /organizations or /organizations.json
  def index
    @orgs = Organization.all
  end

  # GET /organizations/1 or /organizations/1.json
  def show
    @page_title = 'Home'

    # set layout to organization
    render layout: 'organization'
  end

  # GET /organizations/new
  def new
    @org = Organization.new
  end

  # GET /organizations/1/edit
  def edit
    @page_title = 'Settings'

    render layout: 'organization'
  end

  # POST /organizations or /organizations.json
  def create
    @org = Organization.new(organization_params)

    respond_to do |format|
      if @org.save
        format.html { redirect_to organization_url(@org), notice: "Organization was successfully created." }
        format.json { render :show, status: :created, location: @org }
      else
        format.html { render :new, status: :unprocessable_entity }
        format.json { render json: @org.errors, status: :unprocessable_entity }
      end
    end
  end

  # PATCH/PUT /organizations/1 or /organizations/1.json
  def update
    respond_to do |format|
      if @org.update(organization_params)
        format.html { redirect_to organization_url(@org), notice: "Organization was successfully updated." }
        format.json { render :show, status: :ok, location: @org }
      else
        format.html { render :edit, status: :unprocessable_entity }
        format.json { render json: @org.errors, status: :unprocessable_entity }
      end
    end
  end

  # DELETE /organizations/1 or /organizations/1.json
  def destroy
    @org.destroy

    respond_to do |format|
      format.html { redirect_to organizations_url, notice: "Organization was successfully destroyed." }
      format.json { head :no_content }
    end
  end

  private
    # Use callbacks to share common setup or constraints between actions.
    def set_organization
      @org = current_user.organizations.find_by_slug(params[:id])
      raise ActionController::RoutingError, 'Not Found' unless @org
    end

    # Only allow a list of trusted parameters through.
    def organization_params
      params.require(:organization).permit(:name, :slug, :timezone, :location)
    end
end
