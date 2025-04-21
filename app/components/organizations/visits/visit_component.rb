class Organizations::Visits::VisitComponent < ViewComponent::Base
  def initialize(visit:)
    @visit = visit
    @person = visit.person
  end

  # Takes in @visit.start_at and returns a string representing the time
  # in the format of "HH:MM AM/PM" if older than a day, but returns time_ago_in_words if today
  def start_at
    if @visit.start_at.today?
      "#{time_ago_in_words(@visit.start_at)} ago"
    else
      @visit.start_at.strftime("%l:%M %p")
    end
  end
end
