class HealthController < ActionController::Base
  def show = render(json: { status: "ok" })
end
