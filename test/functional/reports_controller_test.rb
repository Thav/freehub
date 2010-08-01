require 'test_helper'

class ReportsControllerTest < ActionController::TestCase

  def setup
    super
    login_as 'greeter'
  end

  def test_index
    get :index, :organization_key => 'sfbk'
    assert_response :success
  end

  def test_visits_report
    get :visits, :organization_key => 'sfbk',
            :report => { :after => '2006-01-01', :before => '2008-01-01'},
            :page => 2
    assert_response :success
    assert_not_nil assigns(:report)
    assert_not_nil assigns(:visits)
    assert_equal 103, assigns(:visits).size
    assert_equal 20, assigns(:visits).to_a.size
    assert_equal 2, assigns(:visits).page
  end

  def test_visits_report_default
    get :visits, :organization_key => 'sfbk'
    assert_response :success
    assert_not_nil assigns(:report)
    assert_not_nil assigns(:visits)
  end

  def test_visits_report_csv
    get :visits, :organization_key => 'sfbk',
            :report => { :after => '2006-01-01', :before => '2008-01-01' },
            :format => 'csv'
    assert_response :success
    assert_not_nil assigns(:visits)
    assert_equal 103, assigns(:visits).size

    output = StringIO.new
    output.binmode
    assert_nothing_raised { @response.body.call(@response, output) }
    lines = output.string.split("\n")
    assert_equal assigns(:visits).size + 1, lines.size
    assert_equal Visit.csv_header, lines[0]
    assert_equal "attachment; filename=\"sfbk_visits_2006-01-01_2008-01-01.csv\"", @response.headers['Content-Disposition']
  end

  def test_services_report
    get :services, :organization_key => 'sfbk',
            :report => {  :end_after => '2006-01-01', :end_before => '2009-01-01',
                          :for_service_types => ['MEMBERSHIP', 'CLASS'] },
            :page => 2
    assert_response :success
    assert_not_nil assigns(:report)
    assert_not_nil assigns(:services)
    assert_equal 39, assigns(:services).size
    assert_equal 19, assigns(:services).to_a.size
    assert_equal 2, assigns(:services).page
    assert_select "input[type=checkbox]", 3
    assert_select "input[type=checkbox][checked=checked]", 2
  end

  def test_services_report_default
    get :services, :organization_key => 'sfbk'
    assert_response :success
    assert_not_nil assigns(:report)
    assert_not_nil assigns(:services)
  end

  def test_services_report_csv
    get :services, :organization_key => 'sfbk',
            :report => {  :end_after => '2006-01-01', :end_before => '2009-01-01',
                          :for_service_types => ['MEMBERSHIP', 'CLASS'] },
            :format => 'csv'
    assert_response :success
    assert_not_nil assigns(:services)
    assert_equal 39, assigns(:services).size

    output = StringIO.new
    output.binmode
    assert_nothing_raised { @response.body.call(@response, output) }
    lines = output.string.split("\n")
    assert_equal assigns(:services).size + 1, lines.size
    assert_equal Service.csv_header, lines[0]
    assert_equal "attachment; filename=\"sfbk_services_2006-01-01_2009-01-01.csv\"", @response.headers['Content-Disposition']
  end

  def test_people_report
    get :people, :organization_key => 'sfbk',
            :report => {  :after => '2008-01-01', :before => '2008-01-05' }
    assert_response :success
    assert_not_nil assigns(:report)
    assert_not_nil assigns(:people)
    assert_equal 4, assigns(:people).size
    assert_equal 4, assigns(:people).to_a.size
    assert_equal 1, assigns(:people).page
  end

  def test_people_report_default
    get :people, :organization_key => 'sfbk'
    assert_response :success
    assert_not_nil assigns(:report)
    assert_not_nil assigns(:people)
  end

  def test_people_report_csv
    get :people, :organization_key => 'sfbk',
            :report => {  :after => '2008-01-01', :before => '2008-01-05',
                          :matching_name => 'mar' },
            :format => 'csv'
    assert_response :success
    assert_not_nil assigns(:people)
    assert_equal 2, assigns(:people).size

    Time.zone = ENV['TIMEZONE_DEFAULT']

    output = StringIO.new
    output.binmode
    assert_nothing_raised { @response.body.call(@response, output) }
    lines = output.string.split("\n")
    assert_equal assigns(:people).size + 1, lines.size
    assert_equal Person.csv_header, lines[0]
    assert_equal "attachment; filename=\"sfbk_people_2008-01-01_2008-01-05.csv\"", @response.headers['Content-Disposition']
  end

  def test_summary_report
    get :summary, :organization_key => 'sfbk',
            :criteria => {  :from => '2006-01-01', :to => '2008-01-01' }
    assert_response :success
    assert assigns(:report)
    assert assigns(:gchart)
  end
  
  def test_volunteer_hours_report
    get :volunteer_hours, :organization_key => 'sfbk',
            :report => { :after => '2008-01-01', :before => '2008-04-01'},
            :hours => 10,
            :page => 2
    assert_response :success
    assert_not_nil assigns(:report)
    assert_not_nil assigns(:volunteer_hours)
    assert_equal 30, assigns(:volunteer_hours).size
    assert_equal 20, assigns(:volunteer_hours).to_a.size
    assert_equal 2, assigns(:volunteer_hours).page
  end
  
  def test_volunteer_hours_report_csv
    get :volunteer_hours, :organization_key => 'sfbk',
            :report => { :after => '2008-01-01', :before => '2008-04-01'},
            :hours => 10,
            :page => 2,
            :format => 'csv'
    assert_response :success
    assert_not_nil assigns(:report)
    assert_not_nil assigns(:volunteer_hours)
    assert_equal 30, assigns(:volunteer_hours).size
    
    output = StringIO.new
    output.binmode
    assert_nothing_raised { @response.body.call(@response, output) }
    lines = output.string.split("\n")
    assert_equal assigns(:volunteer_hours).size + 1, lines.size
    assert_equal Visit.csv_header_hours, lines[0]
    assert_equal "attachment; filename=\"sfbk_volunteer_hours_2008-01-01_2008-04-01.csv\"", @response.headers['Content-Disposition']
  end
  
end
