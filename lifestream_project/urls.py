from django.contrib import admin
from django.urls import path, include

admin.site.site_header = "LifeStream Blood Bank Administration"
admin.site.site_title = "LifeStream Admin Portal"
admin.site.index_title = "National Blood Transfusion & East Singhbhum Geofence Control"

urlpatterns = [
    path('admin/', admin.site.urls),
    path('', include('bloodbank.urls')),
]
