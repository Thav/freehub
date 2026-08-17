class PeopleController < ApplicationController
  before_action :require_user
  def index
    @organization = organization
    @people = @organization.people.where(archived_at: nil).where("display_name ILIKE ?", "%#{params[:q]}%").order(:display_name).limit(15)
  end
  def show
    @organization = organization
    @person = @organization.people.find(params[:id])
  end
end
