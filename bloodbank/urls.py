from django.urls import path
from . import views

urlpatterns = [
    # Core Public Pages
    path('', views.home, name='home'),
    path('donors/', views.donors_list, name='donors'),
    path('request-blood/', views.request_blood, name='request_blood'),
    path('inventory/', views.inventory_view, name='inventory'),
    path('camps/', views.camps_view, name='camps'),
    path('camps/<int:camp_id>/register/', views.register_camp, name='register_camp'),

    # Authentication & Accounts
    path('login/', views.login_view, name='login'),
    path('signup/', views.signup_view, name='signup'),
    path('logout/', views.logout_view, name='logout'),
    path('dashboard/', views.dashboard_redirect, name='dashboard_redirect'),

    # Role Dashboards
    path('dashboard/donor/', views.dashboard_donor, name='dashboard_donor'),
    path('dashboard/hospital/', views.dashboard_hospital, name='dashboard_hospital'),
    path('dashboard/admin/', views.dashboard_admin, name='dashboard_admin'),

    # Actions / AJAX Endpoints
    path('favicon.ico', views.favicon_view, name='favicon'),
    path('donor/pledge-donation/', views.pledge_donation, name='pledge_donation'),
    path('donor/toggle-availability/', views.toggle_donor_availability, name='toggle_availability'),
    path('donor/verify/<int:donor_id>/', views.verify_donor_card, name='verify_donor_card'),
    path('request/<int:req_id>/update-status/', views.update_request_status, name='update_request_status'),
    path('request/<int:req_id>/delete/', views.delete_blood_request, name='delete_blood_request'),
    path('api/hospitals/', views.api_hospitals, name='api_hospitals'),
    path('api/geofence/', views.api_geofence, name='api_geofence'),
    path('api/requests/', views.api_requests, name='api_requests'),
    path('api/analytics/', views.api_analytics, name='api_analytics'),
]
