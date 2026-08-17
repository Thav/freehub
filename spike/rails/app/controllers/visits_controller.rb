class VisitsController < ApplicationController
  before_action :require_user
  def create
    person = organization.people.where(archived_at: nil).find(params[:person_id])
    visit = person.visits.create!(organization: organization, activity: params.fetch(:activity, "project"), arrived_at: Time.current, staff_snapshot: person.staff, member_snapshot: person.member_today?)
    redirect_to organization_person_path(organization, person), notice: "Visit #{visit.id} created"
  end
  def sign_in
    visit = organization.visits.find(params[:id]); visit.update!(started_at: Time.current); redirect_back fallback_location: root_path
  end
  def sign_out
    visit = organization.visits.find(params[:id]); now = Time.current; visit.update!(ended_at: now, duration_seconds: visit.started_at ? (now - visit.started_at).round : nil); redirect_back fallback_location: root_path
  end
end
