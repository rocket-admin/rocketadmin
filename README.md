## Autoadmin

[![Total alerts](https://img.shields.io/lgtm/alerts/g/Autoadmin-org/auto-admin.svg?logo=lgtm&logoWidth=18)](https://lgtm.com/projects/g/Autoadmin-org/auto-admin/alerts/)

Create admin panel for your service with a few clicks

## Installation

You need to run two containers in your production cluster:
1. public.ecr.aws/o1a6p9d1/frontend:latest
2. public.ecr.aws/o1a6p9d1/backend:latest

Available environment variables for frontend container:

API_ROOT - http root for backend container

## Running development server

1. Change default API_ROOT value in docker-compose.yml
2. `docker-compose up`
