from django.urls import path
from . import views


urlpatterns = [
    path('', views.home_page, name='home'),
    path('api/inventory/', views.inventory, name='inventory'),
    path('api/<str:resource>/', views.resource, name='resource'),
    path('api/<str:resource>/<int:pk>/', views.resource, name='resource-detail'),
    path('api/items/<int:pk>/usage/', views.log_usage, name='log-usage'),
    path('export.csv', views.export_csv, name='export-csv'),
]
