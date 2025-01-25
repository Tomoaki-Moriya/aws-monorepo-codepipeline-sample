from logger import my_logger


def lambda_handler(event, context):
    my_logger.info("foo")
