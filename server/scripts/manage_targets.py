#!/usr/bin/env python3
"""
Save and load targets from queues by name.
"""

import json
import os
import sys
from argparse import ArgumentParser

# Set the correct path for imports relative to the script's location
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from sner.server.app import create_app
from sner.server.scheduler.core import QueueManager
from sner.server.scheduler.models import Queue, Target, db


def main():
    """Main function to handle save and load actions for queues and targets."""
    
    parser = ArgumentParser(description="Save and load targets from queues.")
    parser.add_argument('action', choices=['save', 'load'], help="Action to perform: save or load.")
    args = parser.parse_args()

    create_app().app_context().push()

    if args.action == 'save':
        # Save action: export queues and their targets to JSON
        data = {}
        for queue in Queue.query.all():
            targets = [target.target for target in Target.query.filter_by(queue=queue).all()]
            if targets:
                data[queue.name] = targets
        print(json.dumps(data))

    elif args.action == 'load':
        # Load action: import queues and targets from JSON via stdin
        try:
            input_data = json.load(sys.stdin)
        except json.JSONDecodeError:
            print("Invalid JSON input", file=sys.stderr)
            return 1
        
        for queue_name, targets in input_data.items():
            queue = Queue.query.filter_by(name=queue_name).one()
            QueueManager.enqueue(queue, targets)
        db.session.commit()
    
    else:
        print("Invalid action specified", file=sys.stderr)
        return 1

    return 0


if __name__ == '__main__':
    sys.exit(main())
