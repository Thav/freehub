class SessionsController < ApplicationController
  def new; end
  def create
    user = User.find_by("lower(login) = ?", params[:login].to_s.downcase)
    if user&.authenticate(params[:password])
      session[:user_id] = user.id
      organizations = user.organizations.order(:name)
      redirect_to(organizations.one? ? organization_people_path(organizations.first) : organizations_path)
    else
      flash.now[:alert] = "Log in failed"; render :new, status: :unprocessable_entity
    end
  end
  def destroy; reset_session; redirect_to root_path; end
end
